export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function GET(_request: Request, context: { params: { id: string } }) {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId, lessonId: context.params.id },
    include: {
      lesson: {
        include: {
          courseEdition: {
            include: {
              course: { select: { id: true, title: true } },
              client: { select: { id: true, ragioneSociale: true } },
              registrations: {
                include: {
                  employee: { select: { id: true, nome: true, cognome: true } },
                },
              },
            },
          },
          attendances: {
            select: {
              employeeId: true,
              status: true,
              hoursAttended: true,
              notes: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  return NextResponse.json({ data: assignment });
}
