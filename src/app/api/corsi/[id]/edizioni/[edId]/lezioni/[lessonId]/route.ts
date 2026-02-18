import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { parseItalianDate } from "@/lib/date-utils";

const lessonUpdateSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationHours: z.coerce.number().positive().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string; lessonId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, lessonUpdateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const edition = await prisma.courseEdition.findFirst({
    where: { id: context.params.edId, courseId: context.params.id },
    select: { id: true, status: true },
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

  const existing = await prisma.lesson.findUnique({
    where: { id: context.params.lessonId },
  });

  if (!existing || existing.courseEditionId !== edition.id) {
    return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  }

  const { date, startTime, endTime, durationHours, title, notes } =
    validation.data;

  const parsedDate = date ? parseItalianDate(date) : null;
  if (date && !parsedDate) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  const updated = await prisma.lesson.update({
    where: { id: context.params.lessonId },
    data: {
      date: parsedDate ?? undefined,
      startTime: startTime !== undefined ? (startTime || null) : undefined,
      endTime: endTime !== undefined ? (endTime || null) : undefined,
      durationHours: durationHours ?? undefined,
      title: title !== undefined ? (title || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; edId: string; lessonId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findFirst({
    where: { id: context.params.edId, courseId: context.params.id },
    select: { id: true, status: true },
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

  const existing = await prisma.lesson.findUnique({
    where: { id: context.params.lessonId },
  });

  if (!existing || existing.courseEditionId !== edition.id) {
    return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  }

  await prisma.lesson.delete({ where: { id: context.params.lessonId } });

  return NextResponse.json({ ok: true });
}
