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
import { getEffectiveClientContext } from "@/lib/impersonate";

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
        teacherId: true,
        status: true,
        assignedToId: true,
        subject: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    // Contesto EFFETTIVO: durante l'impersonazione admin→cliente il ruolo di sessione resta
    // ADMIN, quindi il ramo "cliente" veniva saltato e il messaggio attribuito all'admin.
    const effectiveClient = await getEffectiveClientContext();
    const isClient = effectiveClient !== null;
    // L'utente che scrive davvero (impersonato se in impersonazione).
    const actingUserId = effectiveClient?.userId ?? session.user.id;

    // NB: `Ticket.clientId` è una FK verso User (nome fuorviante): contiene lo USER id di chi
    // ha aperto il ticket. Il confronto con l'utente corrente è quindi corretto; qui cambia
    // solo che si usa l'utente EFFETTIVO invece di `session.user.id`.
    if (isClient && ticket.clientId !== actingUserId) {
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
        const filePath = await saveTicketAttachment(file, actingUserId);
        attachmentPaths.push(filePath);
      }

      const shouldReopen = isClient
        ? ticket.status === "RESOLVED"
        : ticket.status === "CLOSED" || ticket.status === "RESOLVED";
      const createdMessage = await prisma.$transaction(async (tx) => {
        const messageRow = await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: actingUserId,
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
            where: { id: actingUserId },
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
          // Notify the ticket opener (client or teacher)
          let recipientUserId: string | null = ticket.clientId;
          if (!recipientUserId && ticket.teacherId) {
            const teacher = await prisma.teacher.findUnique({
              where: { id: ticket.teacherId },
              select: { userId: true },
            });
            recipientUserId = teacher?.userId ?? null;
          }
          if (recipientUserId) {
            await prisma.notification.create({
              data: {
                userId: recipientUserId,
                ticketId: ticket.id,
                type: "TICKET_REPLY",
                title: "Nuova risposta al tuo ticket",
                message: `Il supporto ha risposto al ticket "${ticket.subject}"`,
                isGlobal: false,
              },
            });
          }
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
