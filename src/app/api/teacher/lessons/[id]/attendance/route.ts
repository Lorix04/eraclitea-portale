export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTeacherAuth() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId)
    return null;
  return { teacherId: session.user.teacherId, userId: session.user.id };
}

const attendanceSchema = z.object({
  attendances: z.array(
    z.object({
      employeeId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "ABSENT_JUSTIFIED"]),
      hoursAttended: z.number().nullable().optional(),
      notes: z.string().optional(),
    })
  ),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getTeacherAuth();
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessonId = params.id;

  // Verify teacher has assignment for this lesson
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId: auth.teacherId, lessonId },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not assigned to this lesson" }, { status: 403 });
  }

  // Load lesson with all related data
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      courseEdition: {
        include: {
          course: { select: { title: true } },
          client: { select: { ragioneSociale: true } },
          registrations: {
            include: {
              employee: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  codiceFiscale: true,
                },
              },
            },
          },
        },
      },
      attendances: {
        select: {
          employeeId: true,
          status: true,
          hoursAttended: true,
          notes: true,
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Build participants array
  const attendanceMap = new Map(
    lesson.attendances.map((a) => [a.employeeId, a])
  );

  const participants = lesson.courseEdition.registrations.map((reg) => {
    const att = attendanceMap.get(reg.employee.id);
    return {
      employeeId: reg.employee.id,
      nome: reg.employee.nome,
      cognome: reg.employee.cognome,
      codiceFiscale: reg.employee.codiceFiscale,
      status: att?.status ?? null,
      hoursAttended: att?.hoursAttended ?? null,
      notes: att?.notes ?? null,
    };
  });

  // Compute stats
  const total = participants.length;
  const present = participants.filter((p) => p.status === "PRESENT").length;
  const absent = participants.filter((p) => p.status === "ABSENT").length;
  const absentJustified = participants.filter(
    (p) => p.status === "ABSENT_JUSTIFIED"
  ).length;
  const notRecorded = participants.filter((p) => p.status === null).length;

  // canEdit: today or past (compare date only, ignore time)
  const lessonDate = new Date(lesson.date);
  lessonDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canEdit = lessonDate <= today;

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      durationHours: lesson.durationHours,
      title: lesson.title,
      luogo: lesson.luogo,
      courseName: lesson.courseEdition.course.title,
      editionNumber: lesson.courseEdition.editionNumber,
      clientName: lesson.courseEdition.client.ragioneSociale,
    },
    participants,
    stats: { total, present, absent, absentJustified, notRecorded },
    canEdit,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getTeacherAuth();
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessonId = params.id;

  // Verify teacher assignment
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId: auth.teacherId, lessonId },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not assigned to this lesson" }, { status: 403 });
  }

  // Get lesson to check canEdit and get courseEditionId
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { date: true, durationHours: true, courseEditionId: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // canEdit check: reject future lessons
  const lessonDate = new Date(lesson.date);
  lessonDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (lessonDate > today) {
    return NextResponse.json(
      { error: "Cannot record attendance for future lessons" },
      { status: 400 }
    );
  }

  // Parse and validate body
  let data: z.infer<typeof attendanceSchema>;
  try {
    const body = await request.json();
    data = attendanceSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          errors: error.errors.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const courseEditionId = lesson.courseEditionId;

  // Upsert attendances in transaction
  await prisma.$transaction(async (tx) => {
    for (const item of data.attendances) {
      const normalizedHours =
        item.status === "ABSENT"
          ? null
          : (item.hoursAttended ?? lesson.durationHours);

      await tx.attendance.upsert({
        where: {
          lessonId_employeeId: { lessonId, employeeId: item.employeeId },
        },
        create: {
          lessonId,
          employeeId: item.employeeId,
          courseEditionId,
          status: item.status,
          hoursAttended: normalizedHours,
          notes: item.notes ?? null,
          recordedBy: auth.userId,
          recordedAt: new Date(),
        },
        update: {
          status: item.status,
          hoursAttended: normalizedHours,
          notes: item.notes ?? null,
          recordedBy: auth.userId,
          recordedAt: new Date(),
        },
      });
    }
  });

  return NextResponse.json({ success: true, count: data.attendances.length });
}
