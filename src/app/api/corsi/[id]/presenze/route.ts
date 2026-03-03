import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import {
  calculateAttendanceStats,
  type AttendanceStatus,
} from "@/lib/attendance-utils";

const attendanceSchema = z.object({
  attendances: z
    .array(
      z.object({
        lessonId: z.string(),
        employeeId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "ABSENT_JUSTIFIED"]),
        hoursAttended: z.number().min(0).optional().nullable(),
        notes: z.string().optional(),
      })
    )
    .min(1)
    .max(2000),
});

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const clientId = isAdminView
    ? session.user.clientId ?? null
    : effectiveClient?.clientId ?? null;

  if (!isAdminView && !clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.id },
    select: {
      id: true,
      clientId: true,
      editionNumber: true,
      presenzaMinimaType: true,
      presenzaMinimaValue: true,
      course: { select: { id: true, title: true } },
    },
  });

  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (!isAdminView && edition.clientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrationWhere = isAdminView
    ? { courseEditionId: edition.id }
    : { courseEditionId: edition.id, clientId: clientId ?? undefined };

  const registrations = await prisma.courseRegistration.findMany({
    where: registrationWhere,
    include: { employee: true },
    orderBy: { employee: { cognome: "asc" } },
  });

  const employees = registrations.map((reg) => reg.employee);
  const employeeIds = employees.map((employee) => employee.id);

  const lessons = await prisma.lesson.findMany({
    where: { courseEditionId: edition.id },
    orderBy: { date: "asc" },
  });

  const lessonIds = lessons.map((lesson) => lesson.id);
  const attendances =
    lessonIds.length && employeeIds.length
      ? await prisma.attendance.findMany({
          where: {
            lessonId: { in: lessonIds },
            employeeId: { in: employeeIds },
          },
        })
      : [];

  const calculated = calculateAttendanceStats({
    employees: employees.map((employee) => ({
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
    })),
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      durationHours: lesson.durationHours ?? 0,
    })),
    attendances: attendances.map((attendance) => ({
      lessonId: attendance.lessonId,
      employeeId: attendance.employeeId,
      status: attendance.status as AttendanceStatus,
      hoursAttended: attendance.hoursAttended,
    })),
    presenzaMinimaType: edition.presenzaMinimaType,
    presenzaMinimaValue: edition.presenzaMinimaValue,
  });

  return NextResponse.json({
    course: {
      id: edition.course.id,
      title: edition.course.title,
      editionNumber: edition.editionNumber,
    },
    lessons,
    employees: employees.map((employee) => ({
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
      codiceFiscale: employee.codiceFiscale,
    })),
    attendances: attendances.map((attendance) => ({
      id: attendance.id,
      lessonId: attendance.lessonId,
      employeeId: attendance.employeeId,
      status: attendance.status,
      hoursAttended: attendance.hoursAttended,
      notes: attendance.notes ?? undefined,
      recordedBy: attendance.recordedBy ?? undefined,
      recordedAt: attendance.recordedAt,
    })),
    stats: calculated.stats,
    totalLessons: calculated.totalLessons,
    totalHours: calculated.totalHours,
    presenzaMinimaType: calculated.presenzaMinimaType,
    presenzaMinimaValue: calculated.presenzaMinimaValue,
  });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, attendanceSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { attendances } = validation.data;

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.id },
    select: {
      id: true,
      status: true,
      editionNumber: true,
      course: { select: { title: true } },
    },
  });

  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (edition.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "L'edizione e archiviata. Nessuna modifica consentita." },
      { status: 403 }
    );
  }

  const [lessons, registrations] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: { courseEditionId: edition.id },
      select: { id: true, durationHours: true },
    }),
    prisma.courseRegistration.findMany({
      where: { courseEditionId: edition.id },
      select: { employeeId: true },
    }),
  ]);

  const lessonDurationById = new Map(
    lessons.map((lesson) => [lesson.id, lesson.durationHours ?? 0])
  );
  const employeeIds = new Set(registrations.map((reg) => reg.employeeId));

  const invalid = attendances.find((item) => {
    if (!lessonDurationById.has(item.lessonId)) return true;
    if (!employeeIds.has(item.employeeId)) return true;
    if (item.status === "ABSENT") return false;
    if (item.hoursAttended === null || item.hoursAttended === undefined) return false;
    const durationHours = lessonDurationById.get(item.lessonId) ?? 0;
    return item.hoursAttended > durationHours;
  });

  if (invalid) {
    return NextResponse.json(
      {
        error:
          "Lezione o dipendente non valido per questo corso, oppure ore frequentate superiori alla durata della lezione",
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of attendances) {
      const normalizedHours =
        item.status === "ABSENT" ? null : (item.hoursAttended ?? null);

      await tx.attendance.upsert({
        where: {
          lessonId_employeeId: {
            lessonId: item.lessonId,
            employeeId: item.employeeId,
          },
        },
        create: {
          lessonId: item.lessonId,
          employeeId: item.employeeId,
          courseEditionId: context.params.id,
          status: item.status,
          hoursAttended: normalizedHours,
          notes: item.notes ?? null,
          recordedBy: session.user.id,
          recordedAt: new Date(),
        },
        update: {
          courseEditionId: context.params.id,
          status: item.status,
          hoursAttended: normalizedHours,
          notes: item.notes ?? null,
          recordedBy: session.user.id,
          recordedAt: new Date(),
        },
      });
    }
  });

  return NextResponse.json({ ok: true, updated: attendances.length });
}
