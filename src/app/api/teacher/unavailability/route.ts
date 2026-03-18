import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery, validateBody } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

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
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
