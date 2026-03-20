import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateQuery, validateBody } from "@/lib/api-utils";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

const getSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

const postSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  allDay: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const validation = validateQuery(request, getSchema);
    if ("error" in validation) return validation.error;

    const { month, year } = validation.data;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const data = await prisma.teacherUnavailability.findMany({
      where: {
        teacherId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[TEACHER_UNAVAILABILITY_GET] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const validation = await validateBody(request, postSchema);
    if ("error" in validation) return validation.error;

    const { startDate, endDate, allDay, startTime, endTime, reason } = validation.data;

    if (!allDay && (!startTime || !endTime)) {
      return NextResponse.json(
        { error: "startTime e endTime sono obbligatori quando allDay è false" },
        { status: 400 }
      );
    }

    // Generate array of dates from startDate to endDate (inclusive)
    const dates: Date[] = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);

    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const created = await prisma.$transaction(
      dates.map((d) =>
        prisma.teacherUnavailability.create({
          data: {
            teacherId,
            date: d,
            allDay,
            startTime: allDay ? null : startTime,
            endTime: allDay ? null : endTime,
            reason: reason || null,
          },
        })
      )
    );

    return NextResponse.json({ data: created, count: created.length });
  } catch (error) {
    console.error("[TEACHER_UNAVAILABILITY_POST] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
