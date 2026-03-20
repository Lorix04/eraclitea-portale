import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  TICKET_ATTACHMENT_ALLOWED_TYPES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_ATTACHMENT_MAX_SIZE_BYTES,
  isTicketCategory,
} from "@/lib/tickets";
import {
  deleteTicketAttachment,
  saveTicketAttachment,
} from "@/lib/ticket-storage";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = { teacherId };
    if (status && status !== "all") where.status = status;
    if (search) {
      where.subject = { contains: search, mode: "insensitive" };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            message: true,
            createdAt: true,
            senderId: true,
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        closedAt: t.closedAt,
        messagesCount: t._count.messages,
        lastMessage: t.messages[0] || null,
      }))
    );
  } catch (error) {
    console.error("[TEACHER_TICKETS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const formData = await request.formData();
    const subject = String(formData.get("subject") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const files = formData
      .getAll("attachments")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (!subject || subject.length > 200) {
      return NextResponse.json(
        { error: "L'oggetto e obbligatorio e non puo superare 200 caratteri" },
        { status: 400 }
      );
    }

    if (!category || !isTicketCategory(category)) {
      return NextResponse.json(
        { error: "Categoria non valida" },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: "Il messaggio deve contenere almeno 10 caratteri" },
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
        const filePath = await saveTicketAttachment(file, ctx.userId);
        attachmentPaths.push(filePath);
      }

      const ticket = await prisma.$transaction(async (tx) => {
        const createdTicket = await tx.ticket.create({
          data: {
            subject,
            category: category as any,
            teacherId,
            clientId: null,
            status: "OPEN",
            priority: "MEDIUM",
          },
        });

        await tx.ticketMessage.create({
          data: {
            ticketId: createdTicket.id,
            senderId: ctx.userId,
            message,
            attachments: attachmentPaths,
          },
        });

        return createdTicket;
      });

      try {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true },
        });

        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              ticketId: ticket.id,
              type: "TICKET_OPENED" as any,
              title: "Nuovo ticket da docente",
              message: `${subject}`,
              isGlobal: false,
            })),
          });
        }
      } catch (notificationError) {
        console.error(
          "Errore creazione notifiche apertura ticket docente:",
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

      console.error("Errore creazione ticket docente:", error);
      return NextResponse.json(
        { error: "Errore durante la creazione del ticket" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TEACHER_TICKETS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
