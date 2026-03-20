export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  const now = new Date();

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
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
    orderBy: { lesson: { date: "asc" } },
  });

  const totalLessons = assignments.length;
  const totalHours = assignments.reduce((sum, a) => sum + (a.lesson.durationHours || 0), 0);

  const futureAssignments = assignments.filter(a => new Date(a.lesson.date) >= now);
  const upcomingLessons = futureAssignments.length;

  const activeCourseIds = new Set(
    assignments
      .filter(a => a.lesson.courseEdition.status !== "ARCHIVED")
      .map(a => a.lesson.courseEdition.courseId)
  );
  const activeCourses = activeCourseIds.size;

  const nextLessons = futureAssignments.slice(0, 5).map(a => ({
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
  }));

  // Past lessons with no attendance recorded
  const pendingAttendances = assignments
    .filter((a) => new Date(a.lesson.date) < now && a.lesson._count.attendances === 0)
    .map((a) => ({
      lessonId: a.lesson.id,
      date: a.lesson.date,
      courseName: a.lesson.courseEdition.course.title,
    }));

  return NextResponse.json({
    upcomingLessons,
    totalLessons,
    totalHours: Math.round(totalHours * 10) / 10,
    activeCourses,
    nextLessons,
    pendingAttendances,
  });
}
