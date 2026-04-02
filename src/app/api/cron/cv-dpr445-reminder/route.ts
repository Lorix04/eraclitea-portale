import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/security";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph, emailInfoBox } from "@/lib/email-templates";
import { createTeacherNotification } from "@/lib/teacher-notifications";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";
const REMINDER_COOLDOWN_DAYS = 7;

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (
    !apiKey ||
    !process.env.CRON_API_KEY ||
    !safeCompare(apiKey, process.env.CRON_API_KEY)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysFromNow = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  );
  const cooldownThreshold = new Date(
    now.getTime() - REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );

  // Find CVs with deadline approaching (within 3 days) and not recently reminded
  const pendingCvs = await prisma.teacherCvDpr445.findMany({
    where: {
      status: "REQUESTED",
      deadline: { not: null, lte: threeDaysFromNow },
      OR: [
        { reminderSentAt: null },
        { reminderSentAt: { lt: cooldownThreshold } },
      ],
    },
    include: {
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          userId: true,
        },
      },
    },
  });

  let remindersSent = 0;

  for (const cv of pendingCvs) {
    const teacher = cv.teacher;
    if (!teacher) continue;

    const deadlineStr = cv.deadline
      ? cv.deadline.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";
    const daysLeft = cv.deadline
      ? Math.ceil(
          (cv.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;
    const urgencyText =
      daysLeft !== null && daysLeft < 0
        ? "Scadenza superata"
        : daysLeft !== null
          ? `tra ${daysLeft} giorn${daysLeft === 1 ? "o" : "i"}`
          : "";

    if (teacher.email) {
      const html = buildEmailHtml({
        title: "Promemoria: CV DPR 445/2000",
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml: `
          ${emailParagraph("Le ricordiamo che e in attesa la compilazione del suo CV ai sensi del DPR 445/2000.")}
          ${emailInfoBox(`<p style="margin:0; font-size:14px;"><strong>Scadenza: ${deadlineStr}</strong> ${urgencyText ? `\u2014 ${urgencyText}` : ""}</p>`)}
          ${emailParagraph("Acceda al portale per compilare e inviare il documento.")}
        `,
        ctaText: "Compila ora",
        ctaUrl: `${PORTAL_URL}/docente/cv-dpr445`,
      });

      void sendAutoEmail({
        emailType: "CV_DPR445_REMINDER",
        recipientEmail: teacher.email,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject: `Promemoria: compilazione CV DPR 445/2000 \u2014 Scadenza ${deadlineStr}`,
        html,
        ignorePreference: true,
      });
    }

    if (teacher.userId) {
      await createTeacherNotification({
        userId: teacher.userId,
        type: "CV_DPR445_REMINDER",
        title: "Promemoria CV DPR 445",
        message: `Ti ricordiamo di compilare il CV DPR 445/2000. Scadenza: ${deadlineStr}`,
      });
    }

    await prisma.teacherCvDpr445.update({
      where: { id: cv.id },
      data: { reminderSentAt: now },
    });

    remindersSent++;
  }

  return NextResponse.json({ reminders_sent: remindersSent });
}
