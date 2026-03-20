export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

const querySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

type CalendarStatus = "busy" | "unavailable" | "partial" | "free";

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const { month, year } = validation.data;
    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);

    const [assignments, unavailabilities] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: {
          teacherId,
          lesson: {
            date: {
              gte: from,
              lte: to,
            },
          },
        },
        include: {
          lesson: {
            include: {
              courseEdition: {
                select: {
                  id: true,
                  editionNumber: true,
                  status: true,
                  course: { select: { id: true, title: true } },
                  client: { select: { id: true, ragioneSociale: true } },
                },
              },
            },
          },
        },
        orderBy: { lesson: { date: "asc" } },
      }),
      prisma.teacherUnavailability.findMany({
        where: {
          teacherId,
          date: {
            gte: from,
            lte: to,
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
    ]);

    const assignmentsByDay = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const key = dateKey(assignment.lesson.date);
      const current = assignmentsByDay.get(key) ?? [];
      current.push(assignment);
      assignmentsByDay.set(key, current);
    }

    const unavailabilityByDay = new Map<string, typeof unavailabilities>();
    for (const item of unavailabilities) {
      const key = dateKey(item.date);
      const current = unavailabilityByDay.get(key) ?? [];
      current.push(item);
      unavailabilityByDay.set(key, current);
    }

    const days: Array<{
      date: string;
      status: CalendarStatus;
      assignments: typeof assignments;
      unavailability: (typeof unavailabilities)[number] | null;
    }> = [];

    const cursor = new Date(from);
    while (cursor <= to) {
      const key = dateKey(cursor);
      const dayAssignments = assignmentsByDay.get(key) ?? [];
      const dayUnavailability = unavailabilityByDay.get(key) ?? [];
      const allDayUnavailability = dayUnavailability.find((item) => item.allDay);

      let status: CalendarStatus = "free";
      if (allDayUnavailability) {
        status = "unavailable";
      } else if (dayAssignments.length > 0 && dayUnavailability.length > 0) {
        status = "partial";
      } else if (dayAssignments.length > 0) {
        status = "busy";
      } else if (dayUnavailability.length > 0) {
        status = "unavailable";
      }

      days.push({
        date: key,
        status,
        assignments: dayAssignments,
        unavailability: dayUnavailability[0] ?? null,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return NextResponse.json({ days });
  } catch (error) {
    console.error("[TEACHER_CALENDAR_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
