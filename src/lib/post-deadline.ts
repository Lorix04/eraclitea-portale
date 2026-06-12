import { prisma } from "@/lib/prisma";
import {
  notifyAllAdmins,
  emailAllAdmins,
  buildCourseInfoBox,
  emailParagraph,
} from "@/lib/notify-client";
import { adminEditionAnagraficheUrl } from "@/lib/portal-links";
import { formatItalianDate } from "@/lib/date-utils";

const POST_DEADLINE_NOTIFY_THROTTLE_MS = 60 * 60 * 1000; // max 1 avviso/edizione/60 min

/**
 * Registra un evento `PostDeadlineEdit` se la modifica alle anagrafiche di
 * un'edizione avviene DOPO la deadline (`deadlineRegistry`).
 *
 * Le modifiche post-deadline sono SEMPRE consentite: questa funzione le traccia
 * (storico per badge + pop-up) e, throttled, avvisa gli admin. È non bloccante:
 * un eventuale errore non deve mai far fallire il salvataggio chiamante.
 */
export async function recordPostDeadlineEdit(params: {
  courseEditionId: string;
  deadlineRegistry: Date | string | null | undefined;
  userId?: string | null;
  userRole?: string | null;
  source?: string | null;
}): Promise<void> {
  const { courseEditionId, deadlineRegistry } = params;
  if (!courseEditionId || !deadlineRegistry) return;

  const deadline =
    deadlineRegistry instanceof Date
      ? deadlineRegistry
      : new Date(deadlineRegistry);
  if (Number.isNaN(deadline.getTime())) return;
  if (new Date() <= deadline) return; // modifica entro la deadline: niente da tracciare

  // Storico: SEMPRE registrato (non throttled).
  try {
    await prisma.postDeadlineEdit.create({
      data: {
        courseEditionId,
        userId: params.userId ?? null,
        userRole: params.userRole ?? null,
        source: params.source ?? null,
      },
    });
  } catch {
    // Tracciamento non bloccante.
    return;
  }

  // Avviso admin: throttled (max 1/edizione/60 min). Non bloccante.
  try {
    await notifyAdminsPostDeadlineEdit(courseEditionId);
  } catch {
    // L'avviso non deve mai rompere il salvataggio.
  }
}

/**
 * Avvisa (in-app + email) gli admin ASSEGNATI all'edizione (EditionReferent, con
 * fallback a tutti gli admin via notifyAllAdmins/emailAllAdmins) che le anagrafiche
 * sono state modificate dopo la deadline. Throttled per edizione tramite
 * `CourseEdition.lastPostDeadlineNotifyAt` (marker wall-clock indipendente dalle
 * preferenze per-utente: le notifiche in-app sono gated dalle preferenze e le email
 * non creano righe Notification, quindi un marker dedicato è l'unico affidabile per
 * throttlare ENTRAMBI i canali). Lo storico `PostDeadlineEdit` NON è throttled.
 */
async function notifyAdminsPostDeadlineEdit(courseEditionId: string): Promise<void> {
  const now = new Date();

  const edition = await prisma.courseEdition.findUnique({
    where: { id: courseEditionId },
    select: {
      editionNumber: true,
      deadlineRegistry: true,
      lastPostDeadlineNotifyAt: true,
      course: { select: { id: true, title: true } },
      client: { select: { ragioneSociale: true } },
      _count: { select: { postDeadlineEdits: true } },
    },
  });
  if (!edition) return;

  // Throttle: salta se abbiamo già avvisato per questa edizione negli ultimi 60 min.
  if (
    edition.lastPostDeadlineNotifyAt &&
    now.getTime() - edition.lastPostDeadlineNotifyAt.getTime() <
      POST_DEADLINE_NOTIFY_THROTTLE_MS
  ) {
    return;
  }

  // Marca PRIMA dell'invio (riduce il rischio di doppio invio su richieste concorrenti).
  await prisma.courseEdition.update({
    where: { id: courseEditionId },
    data: { lastPostDeadlineNotifyAt: now },
  });

  const courseName = edition.course.title;
  const editionNumber = edition.editionNumber;
  const clientName = edition.client.ragioneSociale;
  const count = edition._count.postDeadlineEdits;
  const deadlineStr = edition.deadlineRegistry
    ? formatItalianDate(edition.deadlineRegistry)
    : "-";
  const modificheLabel = `${count} modific${count === 1 ? "a" : "he"}`;

  // notifyAllAdmins / emailAllAdmins: targeting EditionReferent (+ fallback a tutti)
  // e filtro per preferenze per-utente (in-app/email del tipo ADMIN_POST_DEADLINE_EDIT).
  void notifyAllAdmins({
    type: "ADMIN_POST_DEADLINE_EDIT",
    title: "Anagrafiche modificate dopo la scadenza",
    message: `${courseName} (Ed. #${editionNumber}) — ${clientName}: anagrafiche modificate dopo la deadline (${modificheLabel}).`,
    courseEditionId,
  });

  void emailAllAdmins({
    emailType: "ADMIN_POST_DEADLINE_EDIT",
    subject: `Anagrafiche modificate dopo la scadenza — ${courseName} (Ed. #${editionNumber})`,
    title: "Anagrafiche Modificate Dopo la Scadenza",
    bodyHtml: `
      ${emailParagraph("Le anagrafiche della seguente edizione sono state modificate <strong>dopo la deadline</strong>:")}
      ${buildCourseInfoBox(
        courseName,
        editionNumber,
        `<p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Cliente:</strong> ${clientName}</p>
         <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Deadline:</strong> ${deadlineStr}</p>
         <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Modifiche dopo la scadenza:</strong> ${count}</p>`
      )}
      ${emailParagraph("Accedi al portale per verificare le anagrafiche aggiornate.")}
    `,
    ctaText: "Verifica Anagrafiche",
    ctaUrl: adminEditionAnagraficheUrl(edition.course.id, courseEditionId),
    courseEditionId,
  });
}
