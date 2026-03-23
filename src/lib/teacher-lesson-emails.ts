import { prisma } from "@/lib/prisma";
import { sendAutoEmail } from "@/lib/email-service";
import { createTeacherNotification } from "@/lib/teacher-notifications";
import { formatItalianDate } from "@/lib/date-utils";
import {
  buildEmailHtml,
  emailParagraph,
  emailInfoBox,
} from "@/lib/email-templates";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

type LessonInfo = {
  date: Date;
  startTime: string | null;
  endTime: string | null;
  durationHours: number;
  luogo: string | null;
};

type EditionInfo = {
  courseName: string;
  editionNumber: number;
  clientName: string;
  courseEditionId: string;
};

type TeacherInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  userId: string | null;
  status: string;
};

function formatTime(time: string | null): string {
  return time || "--:--";
}

function formatLessonLine(lesson: LessonInfo): string {
  return `${formatItalianDate(lesson.date)} — ${formatTime(lesson.startTime)}-${formatTime(lesson.endTime)} (${lesson.durationHours}h)${lesson.luogo ? ` — ${lesson.luogo}` : ""}`;
}

function canReceiveEmail(teacher: TeacherInfo): boolean {
  return !!(
    teacher.email &&
    teacher.status !== "INACTIVE" &&
    teacher.status !== "SUSPENDED"
  );
}

// ── ASSIGNED ────────────────────────────────────────────────────────────

export async function sendLessonAssignedEmails(
  teacherId: string,
  lessonIds: string[]
): Promise<void> {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userId: true,
        status: true,
      },
    });
    if (!teacher) return;

    const lessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      include: {
        courseEdition: {
          include: {
            course: { select: { title: true } },
            client: { select: { ragioneSociale: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    if (lessons.length === 0) return;

    // Group by edition for cleaner emails
    const byEdition = new Map<string, { edition: EditionInfo; lessons: LessonInfo[] }>();
    for (const l of lessons) {
      const edId = l.courseEditionId;
      if (!byEdition.has(edId)) {
        byEdition.set(edId, {
          edition: {
            courseName: l.courseEdition.course.title,
            editionNumber: l.courseEdition.editionNumber,
            clientName: l.courseEdition.client.ragioneSociale,
            courseEditionId: edId,
          },
          lessons: [],
        });
      }
      byEdition.get(edId)!.lessons.push({
        date: l.date,
        startTime: l.startTime,
        endTime: l.endTime,
        durationHours: l.durationHours,
        luogo: l.luogo,
      });
    }

    // Notification
    if (teacher.userId) {
      for (const { edition, lessons: edLessons } of byEdition.values()) {
        void createTeacherNotification({
          userId: teacher.userId,
          type: "LESSON_ASSIGNED",
          title: "Nuova lezione assegnata",
          message:
            edLessons.length === 1
              ? `Ti è stata assegnata una lezione: ${edition.courseName} il ${formatItalianDate(edLessons[0].date)}`
              : `Ti sono state assegnate ${edLessons.length} lezioni per ${edition.courseName}.`,
          courseEditionId: edition.courseEditionId,
        });
      }
    }

    // Email
    if (!canReceiveEmail(teacher)) return;

    for (const { edition, lessons: edLessons } of byEdition.values()) {
      const isSingle = edLessons.length === 1;
      const subject = isSingle
        ? `Nuova lezione assegnata — ${edition.courseName}`
        : `Nuove lezioni assegnate — ${edition.courseName}`;

      let bodyHtml: string;
      if (isSingle) {
        const l = edLessons[0];
        bodyHtml = `
          ${emailParagraph(isSingle ? "ti è stata assegnata una nuova lezione:" : "ti sono state assegnate le seguenti lezioni:")}
          ${emailInfoBox(`
            <p style="margin:0 0 8px;"><strong>Corso:</strong> ${edition.courseName}</p>
            <p style="margin:0 0 8px;"><strong>Edizione:</strong> #${edition.editionNumber} — ${edition.clientName}</p>
            <p style="margin:0 0 8px;"><strong>Data:</strong> ${formatItalianDate(l.date)}</p>
            <p style="margin:0 0 8px;"><strong>Orario:</strong> ${formatTime(l.startTime)} - ${formatTime(l.endTime)} (${l.durationHours}h)</p>
            ${l.luogo ? `<p style="margin:0;"><strong>Luogo:</strong> ${l.luogo}</p>` : ""}
          `)}
        `;
      } else {
        const listItems = edLessons.map((l) => `<li style="margin:0 0 6px;">${formatLessonLine(l)}</li>`).join("");
        bodyHtml = `
          ${emailParagraph("ti sono state assegnate le seguenti lezioni:")}
          ${emailInfoBox(`
            <p style="margin:0 0 8px;"><strong>Corso:</strong> ${edition.courseName}</p>
            <p style="margin:0 0 12px;"><strong>Edizione:</strong> #${edition.editionNumber} — ${edition.clientName}</p>
            <ul style="margin:0; padding-left:20px; font-size:14px; line-height:1.6; color:#333333;">${listItems}</ul>
          `)}
        `;
      }

      const html = buildEmailHtml({
        title: subject,
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml,
        ctaText: "Vai alle tue lezioni",
        ctaUrl: `${PORTAL_URL}/docente/lezioni`,
        footerNote:
          "Per qualsiasi domanda, contatta la segreteria all'indirizzo segreteria@sapienta.it",
      });

      void sendAutoEmail({
        emailType: "LESSON_ASSIGNED",
        recipientEmail: teacher.email!,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject,
        html,
        courseEditionId: edition.courseEditionId,
      });
    }
  } catch (error) {
    console.error("[TEACHER_LESSON_ASSIGNED_EMAIL] Error:", error);
  }
}

// ── REMOVED ─────────────────────────────────────────────────────────────

export async function sendLessonRemovedEmail(
  teacherId: string,
  lessonId: string
): Promise<void> {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userId: true,
        status: true,
      },
    });
    if (!teacher) return;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        courseEdition: {
          include: {
            course: { select: { title: true } },
            client: { select: { ragioneSociale: true } },
          },
        },
      },
    });
    if (!lesson) return;

    const courseName = lesson.courseEdition.course.title;
    const editionNumber = lesson.courseEdition.editionNumber;
    const clientName = lesson.courseEdition.client.ragioneSociale;

    // Notification
    if (teacher.userId) {
      void createTeacherNotification({
        userId: teacher.userId,
        type: "LESSON_CANCELLED",
        title: "Rimosso dalla lezione",
        message: `Sei stato rimosso dalla lezione: ${courseName} del ${formatItalianDate(lesson.date)}`,
        courseEditionId: lesson.courseEditionId,
      });
    }

    // Email
    if (!canReceiveEmail(teacher)) return;

    const subject = `Lezione rimossa — ${courseName}`;
    const html = buildEmailHtml({
      title: subject,
      greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
      bodyHtml: `
        ${emailParagraph("ti informiamo che sei stato rimosso dalla seguente lezione:")}
        ${emailInfoBox(`
          <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
          <p style="margin:0 0 8px;"><strong>Edizione:</strong> #${editionNumber} — ${clientName}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${formatItalianDate(lesson.date)}</p>
          <p style="margin:0 0 8px;"><strong>Orario:</strong> ${formatTime(lesson.startTime)} - ${formatTime(lesson.endTime)}</p>
          ${lesson.luogo ? `<p style="margin:0;"><strong>Luogo:</strong> ${lesson.luogo}</p>` : ""}
        `)}
      `,
      footerNote:
        "Per qualsiasi domanda, contatta la segreteria all'indirizzo segreteria@sapienta.it",
    });

    void sendAutoEmail({
      emailType: "LESSON_REMOVED",
      recipientEmail: teacher.email!,
      recipientName: `${teacher.firstName} ${teacher.lastName}`,
      recipientId: teacher.userId ?? undefined,
      subject,
      html,
      courseEditionId: lesson.courseEditionId,
    });
  } catch (error) {
    console.error("[TEACHER_LESSON_REMOVED_EMAIL] Error:", error);
  }
}

// ── UPDATED ─────────────────────────────────────────────────────────────

export async function sendLessonUpdatedEmails(
  lessonId: string
): Promise<void> {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacherAssignments: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                userId: true,
                status: true,
              },
            },
          },
        },
        courseEdition: {
          include: {
            course: { select: { title: true } },
            client: { select: { ragioneSociale: true } },
          },
        },
      },
    });

    if (!lesson || lesson.teacherAssignments.length === 0) return;

    const courseName = lesson.courseEdition.course.title;
    const editionNumber = lesson.courseEdition.editionNumber;
    const clientName = lesson.courseEdition.client.ragioneSociale;
    const subject = `Modifica lezione — ${courseName}`;

    for (const assignment of lesson.teacherAssignments) {
      const teacher = assignment.teacher;

      // Notification
      if (teacher.userId) {
        void createTeacherNotification({
          userId: teacher.userId,
          type: "LESSON_UPDATED",
          title: "Lezione modificata",
          message: `Lezione modificata: ${courseName} del ${formatItalianDate(lesson.date)}`,
          courseEditionId: lesson.courseEditionId,
        });
      }

      // Email
      if (!canReceiveEmail(teacher)) continue;

      const html = buildEmailHtml({
        title: subject,
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml: `
          ${emailParagraph("ti informiamo che la seguente lezione è stata modificata:")}
          ${emailInfoBox(`
            <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
            <p style="margin:0 0 8px;"><strong>Edizione:</strong> #${editionNumber} — ${clientName}</p>
            <p style="margin:0 0 12px; font-size:13px; color:#666;">Dettagli aggiornati:</p>
            <p style="margin:0 0 8px;"><strong>Data:</strong> ${formatItalianDate(lesson.date)}</p>
            <p style="margin:0 0 8px;"><strong>Orario:</strong> ${formatTime(lesson.startTime)} - ${formatTime(lesson.endTime)} (${lesson.durationHours}h)</p>
            ${lesson.luogo ? `<p style="margin:0;"><strong>Luogo:</strong> ${lesson.luogo}</p>` : ""}
          `)}
        `,
        ctaText: "Vai alle tue lezioni",
        ctaUrl: `${PORTAL_URL}/docente/lezioni`,
        footerNote:
          "Per qualsiasi domanda, contatta la segreteria all'indirizzo segreteria@sapienta.it",
      });

      void sendAutoEmail({
        emailType: "LESSON_UPDATED",
        recipientEmail: teacher.email!,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject,
        html,
        courseEditionId: lesson.courseEditionId,
      });
    }
  } catch (error) {
    console.error("[TEACHER_LESSON_UPDATED_EMAIL] Error:", error);
  }
}
