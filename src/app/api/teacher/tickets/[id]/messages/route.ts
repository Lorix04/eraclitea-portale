import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TICKET_ATTACHMENT_ALLOWED_TYPES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/tickets";
import {
  deleteTicketAttachment,
  saveTicketAttachment,
} from "@/lib/ticket-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
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
      select: {
        id: true,
        teacherId: true,
        status: true,
        assignedToId: true,
        subject: true,
      },
    });

    if (!ticket || ticket.teacherId !== teacherId) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 403 }
      );
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "Il ticket e chiuso. Non e possibile inviare messaggi." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const message = String(formData.get("message") ?? "").trim();
    const files = formData
      .getAll("attachments")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (!message) {
      return NextResponse.json(
        { error: "Il messaggio non puo essere vuoto" },
        { status: 400 }
      );
    }

    if (files.length > TICKET_ATTACHMENT_MAX_FILES) {
      return NextResponse.json(
        { error: `Puoi allegare massimo ${TICKET_ATTACHMENT_MAX_FILES} file` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!TICKET_ATTACHMENT_ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo file non supportato: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > TICKET_ATTACHMENT_MAX_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File troppo grande (max ${Math.floor(
              TICKET_ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)
            )}MB): ${file.name}`,
          },
          { status: 400 }
        );
      }
    }

    const attachmentPaths: string[] = [];

    try {
      for (const file of files) {
        const filePath = await saveTicketAttachment(file, session.user.id);
        attachmentPaths.push(filePath);
      }

      const shouldReopen = ticket.status === "RESOLVED";

      const result = await prisma.$transaction(async (tx) => {
        const msg = await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: session.user.id,
            message,
            attachments: attachmentPaths,
          },
        });

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            updatedAt: new Date(),
            ...(shouldReopen
              ? { status: "OPEN", closedAt: null }
              : {}),
          },
        });

        return msg;
      });

      try {
        const adminToNotify = ticket.assignedToId
          ? [{ id: ticket.assignedToId }]
          : await prisma.user.findMany({
              where: { role: "ADMIN", isActive: true },
              select: { id: true },
            });

        if (adminToNotify.length > 0) {
          await prisma.notification.createMany({
            data: adminToNotify.map((a) => ({
              userId: a.id,
              ticketId: ticket.id,
              type: "TICKET_NEW_MESSAGE" as any,
              title: "Nuovo messaggio su ticket",
              message: `Risposta al ticket "${ticket.subject}"`,
              isGlobal: false,
            })),
          });
        }
      } catch (notificationError) {
        console.error(
          "Errore creazione notifiche messaggio ticket docente:",
          notificationError
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      await Promise.all(
        attachmentPaths.map(async (filePath) => {
          try {
            await deleteTicketAttachment(filePath);
          } catch {
            // ignore cleanup errors
          }
        })
      );

      console.error("Errore invio messaggio ticket docente:", error);
      return NextResponse.json(
        { error: "Errore durante l'invio del messaggio" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TEACHER_TICKET_MESSAGES_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
