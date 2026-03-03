import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";

const updateSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "ABSENT_JUSTIFIED"]),
  hoursAttended: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  context: { params: { id: string; attendanceId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, updateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: context.params.attendanceId },
    include: {
      lesson: { select: { courseEditionId: true, durationHours: true } },
    },
  });

  if (
    !attendance ||
    attendance.lesson.courseEditionId !== context.params.id
  ) {
    return NextResponse.json({ error: "Presenza non trovata" }, { status: 404 });
  }

  const normalizedHours =
    validation.data.status === "ABSENT"
      ? null
      : (validation.data.hoursAttended ?? null);

  if (
    typeof normalizedHours === "number" &&
    normalizedHours > (attendance.lesson.durationHours ?? 0)
  ) {
    return NextResponse.json(
      {
        error:
          "Le ore frequentate non possono superare la durata totale della lezione",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.attendance.update({
    where: { id: context.params.attendanceId },
    data: {
      status: validation.data.status,
      hoursAttended: normalizedHours,
      notes: validation.data.notes ?? null,
      recordedBy: session.user.id,
      recordedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
