import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { isTicketPriority, isTicketStatus } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const ticket = await prisma.ticket.findUnique({
    where: { id: context.params.id },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          role: true,
          client: { select: { id: true, ragioneSociale: true } },
        },
      },
      assignedTo: {
        select: { id: true, email: true, role: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              client: { select: { ragioneSociale: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
  }

  if (!isAdminView) {
    if (!effectiveClient || ticket.clientId !== effectiveClient.userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  const adminOptions =
    isAdminView
      ? await prisma.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true, email: true },
          orderBy: { email: "asc" },
        })
      : [];

    return NextResponse.json({
      ...ticket,
      client: {
        id: ticket.client.id,
        email: ticket.client.email,
        role: ticket.client.role,
        name: ticket.client.client?.ragioneSociale ?? ticket.client.email,
      },
      assignedTo: ticket.assignedTo
        ? {
            id: ticket.assignedTo.id,
            email: ticket.assignedTo.email,
            role: ticket.assignedTo.role,
            name: ticket.assignedTo.email,
          }
        : null,
      messages: ticket.messages.map((message) => ({
        id: message.id,
        ticketId: message.ticketId,
        senderId: message.senderId,
        message: message.message,
        attachments: message.attachments,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          email: message.sender.email,
          role: message.sender.role,
          name: message.sender.client?.ragioneSociale ?? message.sender.email,
        },
      })),
      adminOptions:
        isAdminView
          ? adminOptions.map((admin) => ({
              id: admin.id,
              email: admin.email,
              name: admin.email,
            }))
          : [],
    });
  } catch (error) {
    console.error("[TICKET_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

  const ticket = await prisma.ticket.findUnique({
    where: { id: context.params.id },
    select: { id: true, status: true, clientId: true, subject: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : undefined;
  const priority = typeof body.priority === "string" ? body.priority : undefined;
  const rawAssignedToId =
    typeof body.assignedToId === "string" || body.assignedToId === null
      ? body.assignedToId
      : undefined;

  if (status && !isTicketStatus(status)) {
    return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
  }

  if (priority && !isTicketPriority(priority)) {
    return NextResponse.json({ error: "Priorita non valida" }, { status: 400 });
  }

  let assignedToId: string | null | undefined = undefined;
  if (rawAssignedToId !== undefined) {
    assignedToId = rawAssignedToId && rawAssignedToId.trim() ? rawAssignedToId : null;
    if (assignedToId) {
      const admin = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true },
      });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Utente assegnato non valido" },
          { status: 400 }
        );
      }
    }
  }

  const closedAt =
    status === undefined ? undefined : status === "CLOSED" ? new Date() : null;

  const updated = await prisma.ticket.update({
    where: { id: context.params.id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(closedAt !== undefined ? { closedAt } : {}),
    },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          client: { select: { ragioneSociale: true } },
        },
      },
      assignedTo: { select: { id: true, email: true } },
    },
  });

  if (status && ticket.status !== status) {
    const statusLabels: Record<string, string> = {
      OPEN: "aperto",
      IN_PROGRESS: "in lavorazione",
      RESOLVED: "risolto",
      CLOSED: "chiuso",
    };

    try {
      await prisma.notification.create({
        data: {
          userId: ticket.clientId,
          ticketId: ticket.id,
          type: "TICKET_STATUS_CHANGED",
          title: `Ticket ${statusLabels[status] ?? "aggiornato"}`,
          message: `Il tuo ticket "${ticket.subject}" e stato aggiornato a: ${statusLabels[status] ?? status}`,
          isGlobal: false,
        },
      });
    } catch (notificationError) {
      console.error(
        "Errore creazione notifica cambio stato ticket:",
        notificationError
      );
    }
  }

    return NextResponse.json({
      ...updated,
      client: {
        id: updated.client.id,
        email: updated.client.email,
        name: updated.client.client?.ragioneSociale ?? updated.client.email,
      },
      assignedTo: updated.assignedTo
        ? {
            id: updated.assignedTo.id,
            name: updated.assignedTo.email,
          }
        : null,
    });
  } catch (error) {
    console.error("[TICKET_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
