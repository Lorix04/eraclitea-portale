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
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        clientId: true,
        status: true,
        assignedToId: true,
        subject: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const isClient = session.user.role === "CLIENT";
    if (isClient && ticket.clientId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    if (isClient && ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "Il ticket e chiuso. Non e possibile inviare messaggi." },
        { status: 403 }
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

      const shouldReopen = isClient
        ? ticket.status === "RESOLVED"
        : ticket.status === "CLOSED" || ticket.status === "RESOLVED";
      const createdMessage = await prisma.$transaction(async (tx) => {
        const messageRow = await tx.ticketMessage.create({
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
              ? {
                  status: "OPEN",
                  closedAt: null,
                }
              : {}),
          },
        });

        return messageRow;
      });

      try {
        if (isClient) {
          const clientUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              email: true,
              client: { select: { ragioneSociale: true } },
            },
          });
          const clientName =
            clientUser?.client?.ragioneSociale ?? clientUser?.email ?? "Cliente";

          const adminIds = ticket.assignedToId
            ? [ticket.assignedToId]
            : (
                await prisma.user.findMany({
                  where: { role: "ADMIN", isActive: true },
                  select: { id: true },
                })
              ).map((admin) => admin.id);

          if (adminIds.length > 0) {
            await prisma.notification.createMany({
              data: adminIds.map((adminId) => ({
                userId: adminId,
                ticketId: ticket.id,
                type: "TICKET_NEW_MESSAGE",
                title: "Nuovo messaggio ticket",
                message: `${clientName} ha scritto nel ticket "${ticket.subject}"`,
                isGlobal: false,
              })),
            });
          }
        } else {
          await prisma.notification.create({
            data: {
              userId: ticket.clientId,
              ticketId: ticket.id,
              type: "TICKET_REPLY",
              title: "Nuova risposta al tuo ticket",
              message: `Il supporto ha risposto al ticket "${ticket.subject}"`,
              isGlobal: false,
            },
          });
        }
      } catch (notificationError) {
        console.error("Errore creazione notifiche ticket:", notificationError);
      }

      return NextResponse.json(createdMessage, { status: 201 });
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

      console.error("Errore invio messaggio ticket:", error);
      return NextResponse.json(
        { error: "Errore durante l'invio del messaggio" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TICKET_MESSAGES_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
