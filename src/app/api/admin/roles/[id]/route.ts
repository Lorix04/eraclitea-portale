import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "view");
  if (check instanceof NextResponse) return check;

  const role = await prisma.adminRole.findUnique({
    where: { id: context.params.id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          adminInviteStatus: true,
          adminInviteSentAt: true,
        },
        orderBy: { email: "asc" },
      },
    },
  });

  if (!role) {
    return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
  }

  return NextResponse.json({ data: role });
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "edit");
  if (check instanceof NextResponse) return check;

  const role = await prisma.adminRole.findUnique({
    where: { id: context.params.id },
  });

  if (!role) {
    return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
  }

  if (role.isSystem) {
    return NextResponse.json(
      { error: "I ruoli di sistema non possono essere modificati" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description, permissions } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json(
      { error: "Il nome del ruolo è obbligatorio" },
      { status: 400 }
    );
  }

  if (name && name.trim() !== role.name) {
    const existing = await prisma.adminRole.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Esiste già un ruolo con questo nome" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.adminRole.update({
    where: { id: context.params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined
        ? { description: description?.trim() || null }
        : {}),
      ...(permissions !== undefined ? { permissions } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "delete");
  if (check instanceof NextResponse) return check;

  const role = await prisma.adminRole.findUnique({
    where: { id: context.params.id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
  }

  if (role.isSystem) {
    return NextResponse.json(
      { error: "I ruoli di sistema non possono essere eliminati" },
      { status: 403 }
    );
  }

  if (role._count.users > 0) {
    return NextResponse.json(
      {
        error: `Questo ruolo è assegnato a ${role._count.users} utent${role._count.users === 1 ? "e" : "i"}. Rimuovi prima l'assegnazione.`,
      },
      { status: 409 }
    );
  }

  await prisma.adminRole.delete({ where: { id: context.params.id } });
  return NextResponse.json({ success: true });
}
