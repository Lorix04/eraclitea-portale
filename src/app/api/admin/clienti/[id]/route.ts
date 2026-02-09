import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { clientUpdateSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: context.params.id },
    include: {
      users: {
        where: { role: "CLIENT" },
        select: { id: true, email: true, isActive: true },
      },
      categories: { include: { category: true } },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: client.id,
      ragioneSociale: client.ragioneSociale,
      piva: client.piva,
      indirizzo: client.indirizzo,
      referenteNome: client.referenteNome,
      referenteEmail: client.referenteEmail,
      telefono: client.telefono,
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
      sidebarBgColor: client.sidebarBgColor,
      sidebarTextColor: client.sidebarTextColor,
      logoPath: client.logoPath,
      logoLightPath: client.logoLightPath,
      logoFileName: client.logoFileName,
      logoLightFileName: client.logoLightFileName,
      faviconPath: client.faviconPath,
      faviconFileName: client.faviconFileName,
      isActive: client.isActive,
      user: client.users[0] ?? null,
      categories: client.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color,
      })),
    },
  });
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, clientUpdateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { client, user, categoryIds } = validation.data;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedClient = await tx.client.update({
      where: { id: context.params.id },
      data: {
        ragioneSociale: client.ragioneSociale,
        piva: client.piva,
        indirizzo: client.indirizzo || null,
        referenteNome: client.referenteNome,
        referenteEmail: client.referenteEmail,
        telefono: client.telefono || null,
        primaryColor: client.primaryColor || null,
        secondaryColor: client.secondaryColor || null,
        sidebarBgColor: client.sidebarBgColor || null,
        sidebarTextColor: client.sidebarTextColor || null,
      },
    });

    if (categoryIds !== undefined) {
      await tx.clientCategory.deleteMany({
        where: { clientId: updatedClient.id },
      });
      if (categoryIds.length) {
        await tx.clientCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            clientId: updatedClient.id,
            categoryId,
          })),
        });
      }
    }

    if (user) {
      const userRecord = await tx.user.findFirst({
        where: { clientId: updatedClient.id, role: "CLIENT" },
      });

      if (userRecord) {
        await tx.user.update({
          where: { id: userRecord.id },
          data: {
            email: user.email,
            ...(user.password
              ? { passwordHash: await bcrypt.hash(user.password, 12) }
              : {}),
          },
        });
      }
    }

    return updatedClient;
  });

  await logAudit({
    userId: session.user.id,
    action: "CLIENT_UPDATE",
    entityType: "Client",
    entityId: updated.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: context.params.id },
      data: { isActive: false },
    });

    await tx.user.updateMany({
      where: { clientId: context.params.id, role: "CLIENT" },
      data: { isActive: false },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "CLIENT_TOGGLE_STATUS",
    entityType: "Client",
    entityId: context.params.id,
  });

  return NextResponse.json({ ok: true });
}
