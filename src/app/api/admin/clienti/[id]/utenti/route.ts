import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET — List client users
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
    activeCount: clientUsers.filter((cu) => cu.status === "ACTIVE").length,
  });
}

// POST — Admin adds user directly
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

  // Check if email exists
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existingUser) {
    // Check if already associated
    const existingCu = await prisma.clientUser.findUnique({
      where: { clientId_userId: { clientId, userId: existingUser.id } },
    });
    if (existingCu?.status === "ACTIVE") {
      return NextResponse.json({ error: "Utente gia associato" }, { status: 409 });
    }

    // Associate existing user
    await prisma.$transaction(async (tx) => {
      await tx.clientUser.upsert({
        where: { clientId_userId: { clientId, userId: existingUser.id } },
        create: {
          clientId,
          userId: existingUser.id,
          isOwner: body.isOwner ?? false,
          invitedBy: session.user.id,
          status: "ACTIVE",
        },
        update: { status: "ACTIVE", isOwner: body.isOwner ?? false },
      });
      await tx.user.update({
        where: { id: existingUser.id },
        data: { clientId },
      });
    });

    return NextResponse.json({ success: true, userId: existingUser.id });
  }

  // Create new user
  const password =
    "ABCDEFGHJKLMNPQRSTUVWXYZ"[crypto.randomInt(24)] +
    "abcdefghjkmnpqrstuvwxyz"[crypto.randomInt(23)] +
    "23456789"[crypto.randomInt(8)] +
    "!@#$%&*"[crypto.randomInt(7)] +
    Array.from({ length: 12 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*"[
        crypto.randomInt(62)
      ]
    ).join("");
  const passwordHash = await bcrypt.hash(password, 12);

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

  return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
}

// DELETE — Admin removes user from client
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

  const cu = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId: body.userId } },
  });

  if (!cu) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (cu.isOwner) {
    return NextResponse.json(
      { error: "Non puoi rimuovere il proprietario" },
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

  return NextResponse.json({ success: true });
}
