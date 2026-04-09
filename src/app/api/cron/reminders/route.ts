import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/security";
import { endOfDay, formatDate, startOfDay } from "@/lib/date-utils";
import {
  sendAdminDeadlineExpiredEmail,
  sendCertificateExpiringEmail,
  sendDeadlineReminderEmail,
} from "@/lib/email-notifications";
import { notifyEditionUsers, emailEditionUsers, notifyAllClientUsers, emailAllClientUsers, notifyClientOwner, buildCourseInfoBox, emailParagraph, emailInfoBox } from "@/lib/notify-client";

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
  type: import("@prisma/client").NotificationType;
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

    // Notify the client that the deadline has expired
    if (edition.client?.id) {
      void notifyEditionUsers({
        editionId: edition.id,
        clientId: edition.client.id,
        type: "DEADLINE_EXPIRED",
        title: "Deadline anagrafiche scaduta",
        message: `La deadline per ${edition.course.title} (Ed. #${edition.editionNumber}) è scaduta. Contatta l'ente di formazione per informazioni.`,
        courseEditionId: edition.id,
      });
      void emailEditionUsers({
        editionId: edition.id,
        clientId: edition.client.id,
        emailType: "DEADLINE_EXPIRED",
        subject: `Deadline scaduta - ${edition.course.title} (Ed. #${edition.editionNumber})`,
        title: "Deadline Anagrafiche Scaduta",
        bodyHtml: `
          ${emailParagraph("La deadline per l'inserimento delle anagrafiche è scaduta:")}
          ${buildCourseInfoBox(edition.course.title, edition.editionNumber, `<p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Deadline:</strong> ${formatDate(edition.deadlineRegistry)}</p>`)}
          ${emailParagraph("Se non hai ancora inviato le anagrafiche, contatta il tuo referente per informazioni.")}
        `,
        courseEditionId: edition.id,
      });
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

// === SEZIONE 2: DEADLINE OGGI ===
async function processDeadlineToday() {
  const todayFrom = startOfDay(new Date());
  const todayTo = endOfDay(new Date());

  const editions = await prisma.courseEdition.findMany({
    where: {
      status: "PUBLISHED",
      deadlineRegistry: { gte: todayFrom, lte: todayTo },
      registrations: { some: { status: "INSERTED" } },
    },
    include: {
      client: { select: { id: true, ragioneSociale: true, referenteEmail: true, isActive: true } },
      course: { select: { title: true } },
    },
  });

  let count = 0;
  for (const edition of editions) {
    if (!edition.client?.isActive || !edition.client.id) continue;
    await ensureClientNotificationToday({
      type: "DEADLINE_TODAY",
      title: "Deadline anagrafiche OGGI",
      message: `La deadline per ${edition.course.title} (Ed. #${edition.editionNumber}) scade oggi! Invia le anagrafiche entro fine giornata.`,
      courseEditionId: edition.id,
    });
    void notifyEditionUsers({
      editionId: edition.id,
      clientId: edition.client.id,
      type: "DEADLINE_TODAY",
      title: "Deadline anagrafiche OGGI",
      message: `La deadline per ${edition.course.title} (Ed. #${edition.editionNumber}) scade oggi! Invia le anagrafiche entro fine giornata.`,
      courseEditionId: edition.id,
    });
    void emailEditionUsers({
      editionId: edition.id,
      clientId: edition.client.id,
      emailType: "DEADLINE_TODAY",
      subject: `DEADLINE OGGI - ${edition.course.title} (Ed. #${edition.editionNumber})`,
      title: "Deadline Anagrafiche OGGI",
      bodyHtml: `
        ${emailParagraph("<strong>La deadline per l'inserimento anagrafiche scade oggi!</strong>")}
        ${buildCourseInfoBox(edition.course.title, edition.editionNumber, `<p style="margin:0; font-size:14px; color:#CC0000;"><strong>Deadline:</strong> OGGI</p>`)}
        ${emailParagraph("Invia le anagrafiche entro fine giornata.")}
      `,
      ctaText: "Invia Anagrafiche",
      ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/corsi/${edition.id}`,
      courseEditionId: edition.id,
    });
    count++;
  }
  return count;
}

// === SEZIONE 3: CORSO IN PARTENZA DOMANI ===
async function processCourseStartingTomorrow() {
  const tomorrow = addDays(new Date(), 1);
  const from = startOfDay(tomorrow);
  const to = endOfDay(tomorrow);

  const editions = await prisma.courseEdition.findMany({
    where: {
      status: "PUBLISHED",
      lessons: { some: { date: { gte: from, lte: to } } },
    },
    include: {
      client: { select: { id: true, isActive: true } },
      course: { select: { title: true } },
      lessons: {
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
        take: 1,
        select: { date: true, startTime: true, luogo: true },
      },
    },
  });

  let count = 0;
  for (const edition of editions) {
    if (!edition.client?.isActive || !edition.client.id) continue;
    const lesson = edition.lessons[0];
    if (!lesson) continue;

    const luogo = lesson.luogo ? ` presso ${lesson.luogo}` : "";
    const orario = lesson.startTime ? ` alle ${lesson.startTime}` : "";

    await ensureClientNotificationToday({
      type: "COURSE_STARTING_TOMORROW",
      title: "Corso in partenza domani",
      message: `${edition.course.title} (Ed. #${edition.editionNumber}) inizia domani ${formatDate(lesson.date)}${orario}${luogo}.`,
      courseEditionId: edition.id,
    });
    void notifyEditionUsers({
      editionId: edition.id,
      clientId: edition.client.id,
      type: "COURSE_STARTING_TOMORROW",
      title: "Corso in partenza domani",
      message: `${edition.course.title} (Ed. #${edition.editionNumber}) inizia domani ${formatDate(lesson.date)}${orario}${luogo}.`,
      courseEditionId: edition.id,
    });
    void emailEditionUsers({
      editionId: edition.id,
      clientId: edition.client.id,
      emailType: "COURSE_STARTING_TOMORROW",
      subject: `Promemoria: ${edition.course.title} inizia domani`,
      title: "Corso in Partenza Domani",
      bodyHtml: `
        ${emailParagraph("Il seguente corso inizia domani:")}
        ${buildCourseInfoBox(edition.course.title, edition.editionNumber, `<p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Data:</strong> ${formatDate(lesson.date)}${orario}</p>${lesson.luogo ? `<p style="margin:4px 0 0; font-size:14px; color:#1A1A1A;"><strong>Luogo:</strong> ${lesson.luogo}</p>` : ""}`)}
      `,
      courseEditionId: edition.id,
    });
    count++;
  }
  return count;
}

// === SEZIONE 4: ATTESTATI SCADUTI OGGI ===
async function processExpiredCertificatesToday() {
  const todayFrom = startOfDay(new Date());
  const todayTo = endOfDay(new Date());

  const certificates = await prisma.certificate.findMany({
    where: { expiresAt: { gte: todayFrom, lte: todayTo } },
    include: {
      client: { select: { id: true, ragioneSociale: true, referenteEmail: true, isActive: true } },
      employee: { select: { nome: true, cognome: true } },
      courseEdition: { include: { course: { select: { title: true } } } },
    },
  });

  let count = 0;
  for (const cert of certificates) {
    if (!cert.client?.isActive || !cert.client.id) continue;
    const employeeName = `${cert.employee.cognome} ${cert.employee.nome}`.trim();
    const courseName = cert.courseEdition?.course?.title || "Corso";

    if (cert.courseEditionId) {
      void notifyEditionUsers({
        editionId: cert.courseEditionId,
        clientId: cert.client.id,
        type: "CERTIFICATE_EXPIRED",
        title: "Attestato scaduto",
        message: `L'attestato di ${employeeName} per ${courseName} è scaduto oggi.`,
        courseEditionId: cert.courseEditionId,
      });
    } else {
      void notifyAllClientUsers({
        clientId: cert.client.id,
        type: "CERTIFICATE_EXPIRED",
        title: "Attestato scaduto",
        message: `L'attestato di ${employeeName} per ${courseName} è scaduto oggi.`,
      });
    }
    const certEmailParams = {
      clientId: cert.client.id,
      emailType: "CERTIFICATE_EXPIRED",
      subject: `Attestato scaduto - ${employeeName} (${courseName})`,
      title: "Attestato Scaduto",
      bodyHtml: `
        ${emailParagraph("Un attestato è scaduto oggi:")}
        ${emailInfoBox(`
          <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Dipendente:</strong> ${employeeName}</p>
          <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName}</p>
        `)}
        ${emailParagraph("Programma il rinnovo il prima possibile.")}
      `,
      ctaText: "Vai agli Attestati",
      ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/attestati`,
      courseEditionId: cert.courseEditionId ?? undefined,
    };
    if (cert.courseEditionId) {
      void emailEditionUsers({ editionId: cert.courseEditionId, ...certEmailParams });
    } else {
      void emailAllClientUsers(certEmailParams);
    }
    count++;
  }
  return count;
}

// === SEZIONE 5: TICKET INATTIVI 7 GIORNI ===
async function processInactiveTickets() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      updatedAt: { lt: sevenDaysAgo },
    },
    select: {
      id: true,
      subject: true,
      clientId: true,
      teacherId: true,
    },
  });

  let count = 0;
  for (const ticket of tickets) {
    // Check if we already notified today
    const todayStart = startOfDay(new Date());
    const existing = await prisma.notification.findFirst({
      where: {
        type: "TICKET_INACTIVE_REMINDER",
        ticketId: ticket.id,
        createdAt: { gte: todayStart },
      },
      select: { id: true },
    });
    if (existing) continue;

    const userId = ticket.clientId;
    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          type: "TICKET_INACTIVE_REMINDER",
          title: "Ticket in attesa",
          message: `Il tuo ticket "${ticket.subject}" è aperto da 7 giorni senza aggiornamenti.`,
          ticketId: ticket.id,
          isGlobal: false,
        },
      });
      count++;
    }
  }
  return count;
}

// === SEZIONE 6: INVITI SCADUTI ===
async function processExpiredInvites() {
  const now = new Date();
  const expiredInvites = await prisma.clientInvite.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    include: { client: { select: { id: true } } },
  });

  let count = 0;
  for (const invite of expiredInvites) {
    await prisma.clientInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    if (invite.client?.id) {
      void notifyClientOwner({
        clientId: invite.client.id,
        type: "INVITE_EXPIRED_NOTIFY",
        title: "Invito scaduto",
        message: `L'invito inviato a ${invite.email} è scaduto senza essere accettato. Puoi reinviarlo dalla pagina Amministratori.`,
      });
    }
    count++;
  }
  return count;
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || !process.env.CRON_API_KEY || !safeCompare(apiKey, process.env.CRON_API_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    deadline7d, deadline2d, deadlineToday, adminExpired,
    courseStarting, cert60d, cert30d, certExpired,
    inactiveTickets, expiredInvites,
  ] = await Promise.all([
    processDeadlineReminders(7),
    processDeadlineReminders(2),
    processDeadlineToday(),
    processAdminExpiredDeadline(),
    processCourseStartingTomorrow(),
    processExpiringCertificates(60),
    processExpiringCertificates(30),
    processExpiredCertificatesToday(),
    processInactiveTickets(),
    processExpiredInvites(),
  ]);

  return NextResponse.json({
    success: true,
    deadline7d,
    deadline2d,
    deadlineToday,
    adminExpired,
    courseStarting,
    cert60d,
    cert30d,
    certExpired,
    inactiveTickets,
    expiredInvites,
  });
}
