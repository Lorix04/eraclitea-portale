import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  date: z.string().optional(),
  allDay: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const { id } = params;

    const existing = await prisma.teacherUnavailability.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Indisponibilit\u00e0 non trovata" }, { status: 404 });
    }
    if (existing.teacherId !== teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const validation = await validateBody(request, putSchema);
    if ("error" in validation) return validation.error;

    const { date, allDay, startTime, endTime, reason } = validation.data;

    const updated = await prisma.teacherUnavailability.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(allDay !== undefined && { allDay }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(reason !== undefined && { reason }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[TEACHER_UNAVAILABILITY_PUT] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const { id } = params;

    const existing = await prisma.teacherUnavailability.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Indisponibilit\u00e0 non trovata" }, { status: 404 });
    }
    if (existing.teacherId !== teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.teacherUnavailability.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_UNAVAILABILITY_DELETE] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
