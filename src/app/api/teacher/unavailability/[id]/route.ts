import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

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
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
