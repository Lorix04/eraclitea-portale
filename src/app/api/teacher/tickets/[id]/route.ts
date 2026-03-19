import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const teacherId = session.user.teacherId;

    const ticket = await prisma.ticket.findUnique({
      where: { id: context.params.id },
      include: {
        assignedTo: {
          select: { id: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket non trovato" },
        { status: 404 }
      );
    }

    if (ticket.teacherId !== teacherId) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...ticket,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        message: m.message,
        attachments: m.attachments,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: m.sender.role === "ADMIN" ? "Admin" : "Tu",
        senderRole: m.sender.role,
      })),
    });
  } catch (error) {
    console.error("[TEACHER_TICKET_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
