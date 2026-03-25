import { prisma } from "@/lib/prisma";

/**
 * Notify all referents of an edition about an event.
 */
export async function notifyEditionReferents(
  editionId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    const referents = await prisma.editionReferent.findMany({
      where: { courseEditionId: editionId },
      select: { userId: true },
    });

    if (referents.length === 0) return;

    await prisma.notification.createMany({
      data: referents.map((ref) => ({
        userId: ref.userId,
        type: type as any,
        title,
        message,
        courseEditionId: editionId,
        isGlobal: false,
      })),
    });
  } catch (error) {
    console.error("[NOTIFY_EDITION_REFERENTS] Error:", error);
  }
}
