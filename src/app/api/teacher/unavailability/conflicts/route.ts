import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

const querySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) return validation.error;

    const { startDate, endDate } = validation.data;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId,
        lesson: {
          date: { gte: start, lte: end },
        },
      },
      include: {
        lesson: {
          include: {
            courseEdition: {
              include: {
                course: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    const conflicts = assignments.map((a) => ({
      date: a.lesson.date,
      lessonTitle: a.lesson.courseEdition.course.title,
      startTime: a.lesson.startTime,
      endTime: a.lesson.endTime,
    }));

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error("[TEACHER_UNAVAILABILITY_CONFLICTS] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
