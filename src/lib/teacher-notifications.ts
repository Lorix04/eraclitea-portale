import { prisma } from "@/lib/prisma";

export async function createTeacherNotification(params: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  courseEditionId?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        message: params.message ?? null,
        courseEditionId: params.courseEditionId ?? null,
        isGlobal: false,
      },
    });
  } catch (error) {
    console.error("[CREATE_TEACHER_NOTIFICATION] Error:", error);
  }
}
