import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import {
  TICKET_ATTACHMENT_ALLOWED_TYPES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_ATTACHMENT_MAX_SIZE_BYTES,
  isTicketCategory,
  isTicketPriority,
  isTicketStatus,
} from "@/lib/tickets";
import {
  deleteTicketAttachment,
  saveTicketAttachment,
} from "@/lib/ticket-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const { searchParams } = new URL(request.url);

  const statusParam = searchParams.get("status");
  const categoryParam = searchParams.get("category");
  const priorityParam = searchParams.get("priority");
  const clientIdParam = searchParams.get("clientId");
  const searchParam = searchParams.get("search")?.trim();

  const where: Prisma.TicketWhereInput = {};

  if (!isAdminView) {
    if (!effectiveClient) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    where.clientId = effectiveClient.userId;
  } else if (clientIdParam) {
    where.clientId = clientIdParam;
  }

  if (statusParam) {
    if (!isTicketStatus(statusParam)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
    }
    where.status = statusParam;
  }

  if (categoryParam) {
    if (!isTicketCategory(categoryParam)) {
      return NextResponse.json(
        { error: "Categoria non valida" },
        { status: 400 }
      );
    }
    where.category = categoryParam;
  }

  if (priorityParam) {
    if (!isTicketPriority(priorityParam)) {
      return NextResponse.json(
        { error: "Priorita non valida" },
        { status: 400 }
      );
    }
    where.priority = priorityParam;
  }

  if (searchParam) {
    where.OR = [
      { subject: { contains: searchParam, mode: Prisma.QueryMode.insensitive } },
      {
        client: {
          is: {
            email: {
              contains: searchParam,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      },
      {
        client: {
          is: {
            client: {
              is: {
                ragioneSociale: {
                  contains: searchParam,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        },
      },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          email: true,
          client: { select: { id: true, ragioneSociale: true } },
        },
      },
      assignedTo: {
        select: {
          id: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          message: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: { id: true, email: true, role: true },
          },
        },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    clientId: ticket.clientId,
    client: {
      id: ticket.client.id,
      email: ticket.client.email,
      name: ticket.client.client?.ragioneSociale ?? ticket.client.email,
    },
    assignedTo: ticket.assignedTo
      ? {
          id: ticket.assignedTo.id,
          name: ticket.assignedTo.email,
        }
      : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt,
    lastMessage: ticket.messages[0] ?? null,
    messagesCount: ticket._count.messages,
  }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[TICKETS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const files = formData
    .getAll("attachments")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!subject || !category || !message) {
    return NextResponse.json(
      { error: "Oggetto, categoria e messaggio sono obbligatori" },
      { status: 400 }
    );
  }

  if (subject.length > 200) {
    return NextResponse.json(
      { error: "L'oggetto non puo superare 200 caratteri" },
      { status: 400 }
    );
  }

  if (message.length < 10) {
    return NextResponse.json(
      { error: "Il messaggio deve contenere almeno 10 caratteri" },
      { status: 400 }
    );
  }

  if (!isTicketCategory(category)) {
    return NextResponse.json({ error: "Categoria non valida" }, { status: 400 });
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
          error: `File troppo grande: ${file.name} (max ${Math.floor(
            TICKET_ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)
          )}MB)`,
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

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          subject,
          category,
          clientId: session.user.id,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: createdTicket.id,
          senderId: session.user.id,
          message,
          attachments: attachmentPaths,
        },
      });

      return createdTicket;
    });

    try {
      const [admins, creator] = await Promise.all([
        prisma.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            client: { select: { ragioneSociale: true } },
          },
        }),
      ]);

      const clientName =
        creator?.client?.ragioneSociale ?? creator?.email ?? "Cliente";

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            ticketId: ticket.id,
            type: "TICKET_OPENED",
            title: "Nuovo ticket di supporto",
            message: `${clientName} ha aperto un ticket: "${ticket.subject}"`,
            isGlobal: false,
          })),
        });
      }
    } catch (notificationError) {
      console.error(
        "Errore creazione notifiche apertura ticket:",
        notificationError
      );
    }

      return NextResponse.json({ data: ticket }, { status: 201 });
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

      console.error("Errore creazione ticket:", error);
      return NextResponse.json(
        { error: "Errore durante la creazione del ticket" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TICKETS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
