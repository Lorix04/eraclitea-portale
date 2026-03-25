import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { parseItalianDate } from "@/lib/date-utils";
import { checkApiPermission } from "@/lib/permissions";

const lessonUpdateSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationHours: z.coerce.number().positive().optional(),
  luogo: z.string().trim().min(1).optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  context: { params: { id: string; lessonId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "corsi", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const validation = await validateBody(request, lessonUpdateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const existing = await prisma.lesson.findUnique({
    where: { id: context.params.lessonId },
  });

  if (!existing || existing.courseEditionId !== context.params.id) {
    return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  }

  const { date, startTime, endTime, durationHours, luogo, title, notes } =
    validation.data;

  const parsedDate = date ? parseItalianDate(date) : null;
  if (date && !parsedDate) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  const updated = await prisma.lesson.update({
    where: { id: context.params.lessonId },
    data: {
      date: parsedDate ?? undefined,
      startTime:
        startTime !== undefined ? (startTime || null) : undefined,
      endTime: endTime !== undefined ? (endTime || null) : undefined,
      durationHours: durationHours ?? undefined,
      luogo: luogo !== undefined ? (luogo || null) : undefined,
      title: title !== undefined ? (title || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
    },
  });

  // Notify assigned teachers if date/time/location changed
  const relevantFieldChanged =
    date !== undefined || startTime !== undefined || endTime !== undefined ||
    durationHours !== undefined || luogo !== undefined;
  if (relevantFieldChanged) {
    import("@/lib/teacher-lesson-emails").then(({ sendLessonUpdatedEmails }) => {
      void sendLessonUpdatedEmails(context.params.lessonId);
    }).catch(() => {});
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; lessonId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "corsi", "delete")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const existing = await prisma.lesson.findUnique({
    where: { id: context.params.lessonId },
  });

  if (!existing || existing.courseEditionId !== context.params.id) {
    return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  }

  await prisma.lesson.delete({ where: { id: context.params.lessonId } });

  return NextResponse.json({ ok: true });
}
