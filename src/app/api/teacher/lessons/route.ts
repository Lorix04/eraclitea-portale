export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

const querySchema = z.object({
  period: z.enum(["upcoming", "past", "all"]).optional().default("all"),
  courseId: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: Request) {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { period, courseId, search } = validation.data;
  const now = new Date();

  const where: Prisma.TeacherAssignmentWhereInput = { teacherId };

  const lessonWhere: Prisma.LessonWhereInput = {};

  if (period === "upcoming") {
    lessonWhere.date = { gte: now };
  } else if (period === "past") {
    lessonWhere.date = { lt: now };
  }

  if (courseId) {
    lessonWhere.courseEdition = { courseId };
  }

  if (search) {
    lessonWhere.OR = [
      { courseEdition: { course: { title: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
      { luogo: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { courseEdition: { client: { ragioneSociale: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
    ];
  }

  if (Object.keys(lessonWhere).length > 0) {
    where.lesson = lessonWhere;
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where,
    include: {
      lesson: {
        include: {
          courseEdition: {
            include: {
              course: { select: { id: true, title: true } },
              client: { select: { id: true, ragioneSociale: true } },
              _count: { select: { registrations: true } },
            },
          },
          _count: { select: { attendances: true } },
        },
      },
    },
    orderBy: { lesson: { date: period === "past" ? "desc" : "asc" } },
  });

  const data = assignments.map((a) => ({
    id: a.lesson.id,
    assignmentId: a.id,
    date: a.lesson.date,
    startTime: a.lesson.startTime,
    endTime: a.lesson.endTime,
    durationHours: a.lesson.durationHours,
    title: a.lesson.title,
    location: a.lesson.luogo,
    courseName: a.lesson.courseEdition.course.title,
    clientName: a.lesson.courseEdition.client.ragioneSociale,
    editionNumber: a.lesson.courseEdition.editionNumber,
    editionId: a.lesson.courseEdition.id,
    participantsCount: a.lesson.courseEdition._count.registrations,
    attendanceCount: a.lesson._count.attendances,
    attendanceRecorded: a.lesson._count.attendances > 0,
  }));

  return NextResponse.json({ data });
}
