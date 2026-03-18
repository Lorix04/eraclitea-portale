export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAttendanceRegisterPdf } from "@/lib/teacher-attendance-pdf";

async function getTeacherAuth() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId)
    return null;
  return { teacherId: session.user.teacherId, userId: session.user.id };
}

export async function GET(
  _request: Request,
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
    return NextResponse.json(
      { error: "Not assigned to this lesson" },
      { status: 403 }
    );
  }

  // Load lesson with registrations and attendances
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

  // Load teacher name
  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacherId },
    select: { firstName: true, lastName: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  // Build attendance map
  const attendanceMap = new Map(
    lesson.attendances.map((a) => [a.employeeId, a])
  );

  // Build participants
  const participants = lesson.courseEdition.registrations.map((reg, idx) => {
    const att = attendanceMap.get(reg.employee.id);
    return {
      index: idx + 1,
      lastName: reg.employee.cognome,
      firstName: reg.employee.nome,
      fiscalCode: reg.employee.codiceFiscale,
      status: att?.status ?? null,
      hoursAttended: att?.hoursAttended ?? null,
      notes: att?.notes ?? null,
    };
  });

  // Compute stats
  const present = participants.filter((p) => p.status === "PRESENT").length;
  const absent = participants.filter((p) => p.status === "ABSENT").length;
  const absentJustified = participants.filter(
    (p) => p.status === "ABSENT_JUSTIFIED"
  ).length;
  const total = participants.length;

  // Generate PDF
  const pdfBuffer = await generateAttendanceRegisterPdf({
    lesson: {
      date: lesson.date.toISOString(),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      durationHours: lesson.durationHours,
      title: lesson.title,
      location: lesson.luogo,
    },
    course: {
      name: lesson.courseEdition.course.title,
      editionNumber: lesson.courseEdition.editionNumber,
      clientName: lesson.courseEdition.client.ragioneSociale,
    },
    teacher: {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
    },
    participants,
    stats: { present, absent, absentJustified, total },
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="registro-presenze.pdf"',
    },
  });
}
