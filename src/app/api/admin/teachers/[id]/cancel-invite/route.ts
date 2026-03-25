import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "invite")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, status: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (teacher.status !== "PENDING") {
      return NextResponse.json(
        { error: "Solo gli inviti in attesa possono essere annullati" },
        { status: 400 }
      );
    }

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        status: "INACTIVE",
        inviteToken: null,
        inviteTokenExpiry: null,
        inviteSentAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_CANCEL_INVITE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
