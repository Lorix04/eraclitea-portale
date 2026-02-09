import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import {
  deadlineReminderTemplate,
  expiringCertificatesTemplate,
} from "@/lib/email-templates";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 3 * DAY_MS);
  const to = new Date(now.getTime() + 7 * DAY_MS);

  const upcomingDeadlines = await prisma.courseEdition.findMany({
    where: {
      status: "PUBLISHED",
      deadlineRegistry: { gte: from, lte: to },
    },
    include: {
      client: true,
      course: { select: { title: true } },
    },
  });

  let reminderClients = 0;

  for (const edition of upcomingDeadlines) {
    if (!edition.client || !edition.client.isActive) {
      continue;
    }

    const submitted = await prisma.courseRegistration.findMany({
      where: {
        courseEditionId: edition.id,
        status: { in: ["CONFIRMED", "TRAINED"] },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    });

    const submittedClientIds = new Set(submitted.map((item) => item.clientId));
    if (!submittedClientIds.has(edition.clientId)) {
      await send({
        to: edition.client.referenteEmail,
        subject: `Promemoria: ${edition.course.title} (Ed. #${edition.editionNumber})`,
        html: deadlineReminderTemplate(
          `${edition.course.title} (Ed. #${edition.editionNumber})`,
          edition.deadlineRegistry!
        ),
      });
      reminderClients += 1;
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
      courseEdition: { include: { course: true } },
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
          course: cert.courseEdition?.course?.title ?? "Attestato esterno",
          expiresAt: cert.expiresAt!,
        }))
      ),
    });
  }

  return NextResponse.json({
    success: true,
    reminderClients,
    expiringClientsNotified: Object.keys(certsByClient).length,
  });
}
