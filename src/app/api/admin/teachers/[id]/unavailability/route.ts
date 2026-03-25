import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { checkApiPermission } from "@/lib/permissions";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const createSchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  reason: z.string().max(500).optional().or(z.literal("")),
  allDay: z.boolean().optional().default(true),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
});

const deleteSchema = z.object({
  id: z.string().min(1, "ID indisponibilità obbligatorio"),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDayEnd(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function eachDayInclusive(start: Date, end: Date) {
  const days: Date[] = [];
  const current = toDayStart(start);
  const last = toDayStart(end);
  while (current <= last) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "view")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const fromDate = parseDate(validation.data.from);
    const toDate = parseDate(validation.data.to);
    const where = {
      teacherId: context.params.id,
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: toDayStart(fromDate) } : {}),
              ...(toDate ? { lte: toDayEnd(toDate) } : {}),
            },
          }
        : {}),
    };

    const data = await prisma.teacherUnavailability.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[ADMIN_TEACHER_UNAVAILABILITY_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = await validateBody(request, createSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const payload = validation.data;
    const singleDate = parseDate(payload.date);
    const from = parseDate(payload.from);
    const to = parseDate(payload.to);

    let days: Date[] = [];
    if (singleDate) {
      days = [toDayStart(singleDate)];
    } else if (from && to) {
      if (toDayStart(to) < toDayStart(from)) {
        return NextResponse.json(
          { error: "Il range date non è valido" },
          { status: 400 }
        );
      }
      days = eachDayInclusive(from, to);
    } else {
      return NextResponse.json(
        { error: "Specifica una data o un range (from/to)" },
        { status: 400 }
      );
    }

    if (!payload.allDay && (!payload.startTime || !payload.endTime)) {
      return NextResponse.json(
        { error: "Per indisponibilità parziale servono ora inizio e fine" },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      days.map((day) =>
        prisma.teacherUnavailability.create({
          data: {
            teacherId: teacher.id,
            date: day,
            reason: payload.reason?.trim() || null,
            allDay: payload.allDay ?? true,
            startTime: payload.allDay ? null : payload.startTime || null,
            endTime: payload.allDay ? null : payload.endTime || null,
          },
        })
      )
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_TEACHER_UNAVAILABILITY_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => null);
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "ID indisponibilità obbligatorio" },
          { status: 400 }
        );
      }
      id = parsed.data.id;
    }

    const deleted = await prisma.teacherUnavailability.deleteMany({
      where: {
        id,
        teacherId: context.params.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Indisponibilità non trovata" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_UNAVAILABILITY_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

