import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";

const attendanceSchema = z.object({
  attendances: z
    .array(
      z.object({
        lessonId: z.string(),
        employeeId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "ABSENT_JUSTIFIED"]),
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

  const isAdmin = session.user.role === "ADMIN";
  const clientId = session.user.clientId ?? null;

  if (!isAdmin && !clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    select: { id: true, title: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const registrationWhere = isAdmin
    ? { courseId: course.id }
    : { courseId: course.id, clientId: clientId ?? undefined };

  const registrations = await prisma.courseRegistration.findMany({
    where: registrationWhere,
    include: { employee: true },
    orderBy: { employee: { cognome: "asc" } },
  });

  const employees = registrations.map((reg) => reg.employee);
  const employeeIds = employees.map((employee) => employee.id);

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
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

  const attendanceMap = new Map<string, { status: string; notes?: string | null }>();
  for (const attendance of attendances) {
    attendanceMap.set(
      `${attendance.lessonId}:${attendance.employeeId}`,
      { status: attendance.status, notes: attendance.notes }
    );
  }

  const totalLessons = lessons.length;
  const totalHours = lessons.reduce(
    (acc, lesson) => acc + (lesson.durationHours ?? 0),
    0
  );

  const stats = employees.map((employee) => {
    let present = 0;
    let justified = 0;
    let absent = 0;
    let attendedHours = 0;

    for (const lesson of lessons) {
      const entry = attendanceMap.get(`${lesson.id}:${employee.id}`);
      const status = entry?.status ?? "ABSENT";
      if (status === "PRESENT") {
        present += 1;
        attendedHours += lesson.durationHours ?? 0;
      } else if (status === "ABSENT_JUSTIFIED") {
        justified += 1;
        attendedHours += lesson.durationHours ?? 0;
      } else {
        absent += 1;
      }
    }

    const percentage = totalLessons
      ? Math.round(((present + justified) / totalLessons) * 100)
      : 0;

    return {
      employeeId: employee.id,
      employeeName: `${employee.cognome} ${employee.nome}`,
      totalLessons,
      present,
      absent,
      justified,
      percentage,
      totalHours,
      attendedHours,
      belowMinimum: totalLessons ? percentage < 75 : false,
    };
  });

  return NextResponse.json({
    course,
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
      notes: attendance.notes ?? undefined,
      recordedBy: attendance.recordedBy ?? undefined,
      recordedAt: attendance.recordedAt,
    })),
    stats,
    totalLessons,
    totalHours,
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

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    select: { id: true, title: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const [lessons, registrations] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: { courseId: course.id },
      select: { id: true },
    }),
    prisma.courseRegistration.findMany({
      where: { courseId: course.id },
      select: { employeeId: true },
    }),
  ]);

  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const employeeIds = new Set(registrations.map((reg) => reg.employeeId));

  const invalid = attendances.find(
    (item) => !lessonIds.has(item.lessonId) || !employeeIds.has(item.employeeId)
  );
  if (invalid) {
    return NextResponse.json(
      { error: "Lezione o dipendente non valido per questo corso" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of attendances) {
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
          status: item.status,
          notes: item.notes ?? null,
          recordedBy: session.user.id,
          recordedAt: new Date(),
        },
        update: {
          status: item.status,
          notes: item.notes ?? null,
          recordedBy: session.user.id,
          recordedAt: new Date(),
        },
      });
    }

    await tx.notification.create({
      data: {
        type: "ATTENDANCE_RECORDED",
        title: "Presenze registrate",
        message: `Aggiornate le presenze per il corso \"${course.title}\"`,
        courseId: course.id,
        isGlobal: false,
      },
    });
  });

  return NextResponse.json({ ok: true, updated: attendances.length });
}
