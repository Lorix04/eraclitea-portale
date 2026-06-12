import { prisma } from "@/lib/prisma";

/**
 * Registra un evento `PostDeadlineEdit` se la modifica alle anagrafiche di
 * un'edizione avviene DOPO la deadline (`deadlineRegistry`).
 *
 * Le modifiche post-deadline sono SEMPRE consentite: questa funzione serve solo
 * a tracciarle (per badge + storico). È non bloccante: un eventuale errore non
 * deve mai far fallire il salvataggio chiamante.
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
  }
}
