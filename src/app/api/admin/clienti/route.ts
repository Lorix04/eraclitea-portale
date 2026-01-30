import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { clientCreateSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (search) {
    where.OR = [
      { ragioneSociale: { contains: search, mode: "insensitive" } },
      { piva: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      users: {
        where: { role: "CLIENT" },
        select: { id: true, email: true, isActive: true },
      },
      categories: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = clients.map((client) => ({
    id: client.id,
    ragioneSociale: client.ragioneSociale,
    piva: client.piva,
    referenteNome: client.referenteNome,
    referenteEmail: client.referenteEmail,
    telefono: client.telefono,
    isActive: client.isActive,
    user: client.users[0] ?? null,
    categories: client.categories.map((entry) => ({
      id: entry.category.id,
      name: entry.category.name,
      color: entry.category.color,
    })),
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, clientCreateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { client, user, categoryIds } = validation.data;
  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Email utente gia in uso" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(user.password, 12);

  const created = await prisma.$transaction(async (tx) => {
    const createdClient = await tx.client.create({
      data: {
        ragioneSociale: client.ragioneSociale,
        piva: client.piva,
        indirizzo: client.indirizzo || null,
        referenteNome: client.referenteNome,
        referenteEmail: client.referenteEmail,
        telefono: client.telefono || null,
        isActive: true,
        categories: categoryIds?.length
          ? {
              createMany: {
                data: categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : undefined,
      },
    });

    await tx.user.create({
      data: {
        email: user.email,
        passwordHash,
        role: "CLIENT",
        clientId: createdClient.id,
        isActive: true,
      },
    });

    return createdClient;
  });

  await logAudit({
    userId: session.user.id,
    action: "CLIENT_CREATE",
    entityType: "Client",
    entityId: created.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
