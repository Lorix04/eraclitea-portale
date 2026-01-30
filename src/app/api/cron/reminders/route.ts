import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import {
  deadlineReminderTemplate,
  expiringCertificatesTemplate,
} from "@/lib/email-templates";
import { formatItalianDate } from "@/lib/date-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 3 * DAY_MS);
  const to = new Date(now.getTime() + 7 * DAY_MS);

  const upcomingDeadlines = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      deadlineRegistry: { gte: from, lte: to },
    },
    include: {
      visibility: { include: { client: true } },
    },
  });

  let remindersSent = 0;
  let reminderClients = 0;

  for (const course of upcomingDeadlines) {
    const visibleClients =
      course.visibility.length > 0
        ? course.visibility
            .map((item) => item.client)
            .filter((client) => client.isActive)
        : await prisma.client.findMany({ where: { isActive: true } });

    if (!visibleClients.length) {
      continue;
    }

    const submitted = await prisma.courseRegistration.findMany({
      where: {
        courseId: course.id,
        status: { in: ["CONFIRMED", "TRAINED"] },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    });

    const submittedClientIds = new Set(submitted.map((item) => item.clientId));
    const pendingClients = visibleClients.filter(
      (client) => !submittedClientIds.has(client.id)
    );

    if (!pendingClients.length) {
      continue;
    }

    for (const client of pendingClients) {
      await send({
        to: client.referenteEmail,
        subject: `Promemoria: ${course.title}`,
        html: deadlineReminderTemplate(course.title, course.deadlineRegistry!),
      });
      reminderClients += 1;
    }

    const existingReminder = await prisma.notification.findFirst({
      where: {
        courseId: course.id,
        type: "REMINDER",
        createdAt: { gte: new Date(now.getTime() - DAY_MS) },
      },
    });

    if (!existingReminder) {
      await prisma.notification.create({
        data: {
          type: "REMINDER",
          title: `Scadenza vicina: ${course.title}`,
          message: `La deadline per l'invio anagrafiche e' ${
            course.deadlineRegistry ? formatItalianDate(course.deadlineRegistry) : ""
          }`,
          courseId: course.id,
          isGlobal: course.visibility.length === 0,
        },
      });
      remindersSent += 1;
    }
  }

  const expiringCerts = await prisma.certificate.findMany({
    where: {
      expiresAt: {
        gte: now,
        lte: new Date(now.getTime() + 30 * DAY_MS),
      },
    },
    include: {
      client: true,
      employee: true,
      course: true,
    },
  });

  const certsByClient = expiringCerts.reduce((acc, cert) => {
    if (!acc[cert.clientId]) {
      acc[cert.clientId] = [];
    }
    acc[cert.clientId].push(cert);
    return acc;
  }, {} as Record<string, typeof expiringCerts>);

  for (const certs of Object.values(certsByClient)) {
    const client = certs[0]?.client;
    if (!client || !client.isActive) {
      continue;
    }

    await send({
      to: client.referenteEmail,
      subject: `${certs.length} attestati in scadenza`,
      html: expiringCertificatesTemplate(
        certs.map((cert) => ({
          employee: `${cert.employee.cognome} ${cert.employee.nome}`,
          course: cert.course.title,
          expiresAt: cert.expiresAt!,
        }))
      ),
    });
  }

  return NextResponse.json({
    success: true,
    remindersSent,
    reminderClients,
    expiringClientsNotified: Object.keys(certsByClient).length,
  });
}
