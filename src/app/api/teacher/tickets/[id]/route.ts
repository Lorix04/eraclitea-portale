import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

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
