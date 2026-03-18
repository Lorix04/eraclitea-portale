export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Auth helper
async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
