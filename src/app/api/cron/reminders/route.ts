import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfDay, formatDate, startOfDay } from "@/lib/date-utils";
import {
  sendAdminDeadlineExpiredEmail,
  sendCertificateExpiringEmail,
  sendDeadlineReminderEmail,
} from "@/lib/email-notifications";

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function wasSentToday(params: {
  emailType: string;
  courseEditionId?: string | null;
  recipientId?: string | null;
  subject?: string;
}) {
  const todayStart = startOfDay(new Date());
  const existing = await prisma.emailLog.findFirst({
    where: {
      emailType: params.emailType,
      courseEditionId: params.courseEditionId ?? null,
      recipientId: params.recipientId ?? null,
      ...(params.subject ? { subject: params.subject } : {}),
      sentAt: { gte: todayStart },
      status: "SENT",
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function ensureClientNotificationToday(params: {
  type:
    | "DEADLINE_REMINDER_7D"
    | "DEADLINE_REMINDER_2D"
    | "CERTIFICATE_EXPIRING_60D"
    | "CERTIFICATE_EXPIRING_30D";
  title: string;
  message: string;
  courseEditionId: string;
}) {
  const todayStart = startOfDay(new Date());
  const existing = await prisma.notification.findFirst({
    where: {
      type: params.type,
      courseEditionId: params.courseEditionId,
      title: params.title,
      createdAt: { gte: todayStart },
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.notification.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      courseEditionId: params.courseEditionId,
      isGlobal: false,
    },
  });

  return true;
}

async function processDeadlineReminders(daysRemaining: 7 | 2) {
  const target = addDays(new Date(), daysRemaining);
  const from = startOfDay(target);
  const to = endOfDay(target);
  const emailType =
    daysRemaining === 7 ? "REMINDER_DEADLINE_7D" : "REMINDER_DEADLINE_2D";
  const notificationType =
    daysRemaining === 7 ? "DEADLINE_REMINDER_7D" : "DEADLINE_REMINDER_2D";

  const editions = await prisma.courseEdition.findMany({
    where: {
      status: "PUBLISHED",
      deadlineRegistry: { gte: from, lte: to },
    },
    include: {
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
          isActive: true,
        },
      },
      course: { select: { title: true } },
      registrations: { select: { id: true } },
    },
  });

  let sentCount = 0;

  for (const edition of editions) {
    const client = edition.client;
    if (!client?.isActive || !client.referenteEmail) {
      continue;
    }

    const alreadySent = await wasSentToday({
      emailType,
      courseEditionId: edition.id,
      recipientId: client.id,
    });

    if (alreadySent) {
      continue;
    }

    await ensureClientNotificationToday({
      type: notificationType,
      title:
        daysRemaining === 2
          ? "Deadline anagrafiche tra 2 giorni"
          : "Deadline anagrafiche tra 7 giorni",
      message: `${edition.course.title} (Ed. #${edition.editionNumber}) - Deadline anagrafiche il ${formatDate(edition.deadlineRegistry)}`,
      courseEditionId: edition.id,
    });

    const success = await sendDeadlineReminderEmail({
      clientEmail: client.referenteEmail,
      clientName: client.referenteNome || client.ragioneSociale,
      clientId: client.id,
      courseName: edition.course.title,
      editionNumber: edition.editionNumber,
      deadlineDate: formatDate(edition.deadlineRegistry),
      daysRemaining,
      registeredCount: edition.registrations.length,
      courseEditionId: edition.id,
    });

    if (success) sentCount += 1;
  }

  return sentCount;
}

async function processAdminExpiredDeadline() {
  const yesterday = addDays(new Date(), -1);
  const from = startOfDay(yesterday);
  const to = endOfDay(yesterday);

  const editions = await prisma.courseEdition.findMany({
    where: {
      status: "PUBLISHED",
      deadlineRegistry: { gte: from, lte: to },
    },
    include: {
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
        },
      },
      course: { select: { title: true } },
      registrations: { select: { id: true } },
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true },
  });

  let sentCount = 0;

  for (const edition of editions) {
    for (const admin of admins) {
      const alreadySent = await wasSentToday({
        emailType: "ADMIN_DEADLINE_EXPIRED",
        courseEditionId: edition.id,
        recipientId: admin.id,
      });

      if (alreadySent) {
        continue;
      }

      const success = await sendAdminDeadlineExpiredEmail({
        adminEmail: admin.email,
        adminName: admin.email,
        adminId: admin.id,
        clientName: edition.client?.ragioneSociale || "Cliente",
        courseName: edition.course.title,
        editionNumber: edition.editionNumber,
        deadlineDate: formatDate(edition.deadlineRegistry),
        registeredCount: edition.registrations.length,
        courseEditionId: edition.id,
      });

      if (success) sentCount += 1;
    }
  }

  return sentCount;
}

async function processExpiringCertificates(daysRemaining: 60 | 30) {
  const target = addDays(new Date(), daysRemaining);
  const from = startOfDay(target);
  const to = endOfDay(target);

  const certificates = await prisma.certificate.findMany({
    where: {
      expiresAt: { gte: from, lte: to },
    },
    include: {
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
          isActive: true,
        },
      },
      employee: {
        select: {
          nome: true,
          cognome: true,
        },
      },
      courseEdition: {
        include: {
          course: { select: { title: true } },
        },
      },
    },
  });

  let sentCount = 0;
  const emailType =
    daysRemaining === 60 ? "CERTIFICATE_EXPIRING_60D" : "CERTIFICATE_EXPIRING_30D";
  const notificationType =
    daysRemaining === 60
      ? "CERTIFICATE_EXPIRING_60D"
      : "CERTIFICATE_EXPIRING_30D";

  for (const cert of certificates) {
    const client = cert.client;
    if (!client?.isActive || !client.referenteEmail || !cert.expiresAt) {
      continue;
    }

    const employeeName = `${cert.employee.cognome} ${cert.employee.nome}`.trim();
    const courseName = cert.courseEdition?.course?.title || "Corso";
    const expiryDate = formatDate(cert.expiresAt);
    const expectedSubject = `${daysRemaining <= 30 ? "ATTENZIONE - " : ""}Attestato in scadenza - ${employeeName} (${courseName}) - ${expiryDate}`;

    const alreadySent = await wasSentToday({
      emailType,
      courseEditionId: cert.courseEditionId,
      recipientId: client.id,
      subject: expectedSubject,
    });

    if (alreadySent) {
      continue;
    }

    if (cert.courseEditionId) {
      await ensureClientNotificationToday({
        type: notificationType,
        title:
          daysRemaining === 30
            ? "Attestato in scadenza tra 30 giorni"
            : "Attestato in scadenza tra 60 giorni",
        message: `Attestato ${courseName} di ${employeeName} in scadenza il ${expiryDate}.`,
        courseEditionId: cert.courseEditionId,
      });
    }

    const success = await sendCertificateExpiringEmail({
      clientEmail: client.referenteEmail,
      clientName: client.referenteNome || client.ragioneSociale,
      clientId: client.id,
      employeeName,
      courseName,
      expiryDate,
      daysRemaining,
      courseEditionId: cert.courseEditionId ?? undefined,
    });

    if (success) sentCount += 1;
  }

  return sentCount;
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deadline7d, deadline2d, adminExpired, cert60d, cert30d] =
    await Promise.all([
      processDeadlineReminders(7),
      processDeadlineReminders(2),
      processAdminExpiredDeadline(),
      processExpiringCertificates(60),
      processExpiringCertificates(30),
    ]);

  return NextResponse.json({
    success: true,
    deadline7d,
    deadline2d,
    adminExpired,
    cert60d,
    cert30d,
  });
}
