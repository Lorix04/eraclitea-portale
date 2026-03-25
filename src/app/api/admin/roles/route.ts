import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const check = await requirePermission("ruoli", "view");
  if (check instanceof NextResponse) return check;

  const roles = await prisma.adminRole.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    data: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isDefault: r.isDefault,
      permissions: r.permissions,
      usersCount: r._count.users,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const check = await requirePermission("ruoli", "create");
  if (check instanceof NextResponse) return check;

  const body = await request.json();
  const { name, description, permissions } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Il nome del ruolo è obbligatorio" },
      { status: 400 }
    );
  }

  if (!permissions || typeof permissions !== "object") {
    return NextResponse.json(
      { error: "I permessi sono obbligatori" },
      { status: 400 }
    );
  }

  const existing = await prisma.adminRole.findUnique({
    where: { name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Esiste già un ruolo con questo nome" },
      { status: 409 }
    );
  }

  const role = await prisma.adminRole.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      permissions,
      isSystem: false,
      isDefault: false,
    },
  });

  return NextResponse.json({ data: role }, { status: 201 });
}
