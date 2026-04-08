import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { canAddUser } from "@/lib/client-users";

export const dynamic = "force-dynamic";

function buildTemporaryPassword() {
  return (
    "ABCDEFGHJKLMNPQRSTUVWXYZ"[crypto.randomInt(24)] +
    "abcdefghjkmnpqrstuvwxyz"[crypto.randomInt(23)] +
    "23456789"[crypto.randomInt(8)] +
    "!@#$%&*"[crypto.randomInt(7)] +
    Array.from(
      { length: 12 },
      () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*"[
          crypto.randomInt(62)
        ]
    ).join("")
  );
}

async function getLimitErrorResponse(clientId: string) {
  const limit = await canAddUser(clientId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Limite amministratori raggiunto (${limit.current}/${limit.max})` },
      { status: 400 }
    );
  }
  return null;
}

async function activateClientUser(params: {
  clientId: string;
  userId: string;
  isOwner: boolean;
  invitedBy: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.clientUser.upsert({
      where: {
        clientId_userId: { clientId: params.clientId, userId: params.userId },
      },
      create: {
        clientId: params.clientId,
        userId: params.userId,
        isOwner: params.isOwner,
        invitedBy: params.invitedBy,
        status: "ACTIVE",
      },
      update: {
        status: "ACTIVE",
        isOwner: params.isOwner,
        invitedBy: params.invitedBy,
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: { clientId: params.clientId },
    });
  });
}

// GET - List client users
export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "view");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;

  const clientUsers = await prisma.clientUser.findMany({
    where: { clientId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isOwner: "desc" }, { invitedAt: "asc" }],
  });

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { maxUsers: true },
  });

  const activeCount = clientUsers.filter((cu) => cu.status === "ACTIVE").length;

  return NextResponse.json({
    users: clientUsers.map((cu) => ({
      id: cu.user.id,
      name: cu.user.name,
      email: cu.user.email,
      isOwner: cu.isOwner,
      status: cu.status,
      invitedAt: cu.invitedAt,
      lastLoginAt: cu.user.lastLoginAt,
      isActive: cu.user.isActive,
    })),
    maxUsers: client?.maxUsers ?? null,
    usedCount: clientUsers.length,
    activeCount,
  });
}

// POST - Admin adds user directly
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "manage-users");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const clientId = context.params.id;

  let body: { email?: string; name?: string; isOwner?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  try {
    if (existingUser) {
      const existingClientUser = await prisma.clientUser.findUnique({
        where: { clientId_userId: { clientId, userId: existingUser.id } },
        select: { status: true },
      });

      if (existingClientUser?.status === "ACTIVE") {
        return NextResponse.json(
          { error: "Utente gia associato" },
          { status: 409 }
        );
      }

      if (!existingClientUser) {
        const limitError = await getLimitErrorResponse(clientId);
        if (limitError) return limitError;
      }

      await activateClientUser({
        clientId,
        userId: existingUser.id,
        isOwner: body.isOwner ?? false,
        invitedBy: session.user.id,
      });

      return NextResponse.json({
        success: true,
        userId: existingUser.id,
        message:
          existingClientUser?.status === "INACTIVE"
            ? "Amministratore riattivato"
            : "Utente esistente associato al client",
      });
    }

    const limitError = await getLimitErrorResponse(clientId);
    if (limitError) return limitError;

    const passwordHash = await bcrypt.hash(buildTemporaryPassword(), 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: body.name || null,
          passwordHash,
          role: "CLIENT",
          clientId,
          mustChangePassword: true,
          isActive: true,
        },
      });
      await tx.clientUser.create({
        data: {
          clientId,
          userId: user.id,
          isOwner: body.isOwner ?? false,
          invitedBy: session.user.id,
          status: "ACTIVE",
        },
      });
      return user;
    });

    await logAudit({
      userId: session.user.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: newUser.id,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json(
      {
        success: true,
        userId: newUser.id,
        message: "Nuovo amministratore creato e associato",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const racedUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });

      if (racedUser) {
        const racedClientUser = await prisma.clientUser.findUnique({
          where: { clientId_userId: { clientId, userId: racedUser.id } },
          select: { status: true },
        });

        if (racedClientUser?.status !== "ACTIVE") {
          if (!racedClientUser) {
            const limitError = await getLimitErrorResponse(clientId);
            if (limitError) return limitError;
          }

          await activateClientUser({
            clientId,
            userId: racedUser.id,
            isOwner: body.isOwner ?? false,
            invitedBy: session.user.id,
          });
        }

        return NextResponse.json({
          success: true,
          userId: racedUser.id,
          message:
            racedClientUser?.status === "INACTIVE"
              ? "Amministratore riattivato"
              : "Utente associato al client",
        });
      }
    }

    console.error("[ADMIN_CLIENT_USERS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore durante l'aggiunta dell'amministratore" },
      { status: 500 }
    );
  }
}

// PATCH - Admin toggles membership state
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "manage-users");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;

  let body: { userId?: string; action?: "deactivate" | "reactivate" } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.userId || !body.action) {
    return NextResponse.json(
      { error: "userId e action richiesti" },
      { status: 400 }
    );
  }

  const clientUser = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId: body.userId } },
    include: { user: { select: { email: true } } },
  });

  if (!clientUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (clientUser.isOwner) {
    return NextResponse.json(
      { error: "Non puoi modificare lo stato del proprietario" },
      { status: 400 }
    );
  }

  if (body.action === "deactivate") {
    if (clientUser.status === "INACTIVE") {
      return NextResponse.json(
        { error: "Utente gia disattivato" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.clientUser.update({
        where: { clientId_userId: { clientId, userId: body.userId! } },
        data: { status: "INACTIVE" },
      });
      await tx.user.update({
        where: { id: body.userId! },
        data: { clientId: null },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Amministratore ${clientUser.user.email} disattivato`,
    });
  }

  if (clientUser.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Utente gia attivo" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientUser.update({
      where: { clientId_userId: { clientId, userId: body.userId! } },
      data: { status: "ACTIVE" },
    });
    await tx.user.update({
      where: { id: body.userId! },
      data: { clientId },
    });
  });

  return NextResponse.json({
    success: true,
    message: `Amministratore ${clientUser.user.email} riattivato`,
  });
}

// DELETE - Admin hard-removes user from client
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "manage-users");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;

  let body: { userId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId richiesto" }, { status: 400 });
  }

  const clientUser = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId: body.userId } },
    include: { user: { select: { email: true } } },
  });

  if (!clientUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (clientUser.isOwner) {
    return NextResponse.json(
      { error: "Non puoi rimuovere il proprietario" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientUser.delete({
      where: { clientId_userId: { clientId, userId: body.userId! } },
    });
    await tx.user.update({
      where: { id: body.userId! },
      data: { clientId: null },
    });
  });

  return NextResponse.json({
    success: true,
    message: `Amministratore ${clientUser.user.email} eliminato`,
  });
}
