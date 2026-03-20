import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

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
