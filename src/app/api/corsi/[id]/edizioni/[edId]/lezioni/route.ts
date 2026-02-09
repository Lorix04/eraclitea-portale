import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { parseItalianDate } from "@/lib/date-utils";
import { Prisma } from "@prisma/client";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
});

const lessonSchema = z.object({
  date: z.string().min(1, "Data obbligatoria"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationHours: z.coerce.number().positive("Durata obbligatoria"),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { page, limit } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const skip = (safePage - 1) * safeLimit;

  const edition = await prisma.courseEdition.findFirst({
    where: { id: context.params.edId, courseId: context.params.id },
    select: { id: true },
  });

  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  const [lessons, total, totalEmployees] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: { courseEditionId: edition.id },
      orderBy: { date: "asc" },
      include: { _count: { select: { attendances: true } } },
      skip,
      take: safeLimit,
    }),
    prisma.lesson.count({ where: { courseEditionId: edition.id } }),
    prisma.courseRegistration.count({ where: { courseEditionId: edition.id } }),
  ]);

  const lessonIds = lessons.map((lesson) => lesson.id);
  const attendanceRows = lessonIds.length
    ? await prisma.attendance.groupBy({
        by: ["lessonId", "status"],
        where: { lessonId: { in: lessonIds } },
        _count: { _all: true },
      })
    : [];

  const counts = new Map<
    string,
    { present: number; absent: number; justified: number }
  >();

  for (const row of attendanceRows) {
    const existing = counts.get(row.lessonId) ?? {
      present: 0,
      absent: 0,
      justified: 0,
    };
    if (row.status === "PRESENT") {
      existing.present += row._count._all;
    } else if (row.status === "ABSENT_JUSTIFIED") {
      existing.justified += row._count._all;
    } else {
      existing.absent += row._count._all;
    }
    counts.set(row.lessonId, existing);
  }

  const data = lessons.map((lesson) => ({
    ...lesson,
    attendanceCounts: counts.get(lesson.id) ?? {
      present: 0,
      absent: 0,
      justified: 0,
    },
  }));

  return NextResponse.json({
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    totalEmployees,
  });
}

export async function POST(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, lessonSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { date, startTime, endTime, durationHours, title, notes } =
    validation.data;

  const parsedDate = parseItalianDate(date);
  if (!parsedDate) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  const edition = await prisma.courseEdition.findFirst({
    where: { id: context.params.edId, courseId: context.params.id },
    select: { id: true },
  });

  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  try {
    const lesson = await prisma.lesson.create({
      data: {
        courseEditionId: edition.id,
        date: parsedDate,
        startTime: startTime || null,
        endTime: endTime || null,
        durationHours,
        title: title || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Lezione già presente per questa data/orario" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Errore creazione lezione" }, { status: 500 });
  }
}
