import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, status: true, userId: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (teacher.status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "Solo i docenti sospesi possono essere riattivati" },
        { status: 400 }
      );
    }

    if (teacher.userId) {
      await prisma.$transaction([
        prisma.teacher.update({
          where: { id: teacher.id },
          data: { status: "ACTIVE", active: true },
        }),
        prisma.user.update({
          where: { id: teacher.userId },
          data: { isActive: true },
        }),
      ]);
    } else {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { status: "ACTIVE", active: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_REACTIVATE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
