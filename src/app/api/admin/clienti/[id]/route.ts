import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { clientUpdateSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "clienti", "view")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
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
  if (!checkApiPermission(session, "clienti", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
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
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "clienti", "delete")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({
    where: { id: context.params.id },
    select: {
      id: true,
      ragioneSociale: true,
      _count: {
        select: {
          employees: true,
          editions: true,
          registrations: true,
          certificates: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  if (client._count.employees > 0 || client._count.editions > 0) {
    return NextResponse.json(
      {
        error: `Impossibile eliminare: il cliente ha ${client._count.employees} dipendenti e ${client._count.editions} corsi associati`,
      },
      { status: 409 }
    );
  }

  if (client._count.registrations > 0 || client._count.certificates > 0) {
    return NextResponse.json(
      {
        error:
          "Impossibile eliminare: il cliente ha registrazioni o attestati associati",
      },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { clientId: context.params.id },
        select: { id: true },
      });
      const userIds = users.map((user) => user.id);

      if (userIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      await tx.clientCategory.deleteMany({
        where: { clientId: context.params.id },
      });

      await tx.courseVisibility.deleteMany({
        where: { clientId: context.params.id },
      });

      await tx.notificationRead.deleteMany({
        where: { clientId: context.params.id },
      });

      await tx.client.delete({
        where: { id: context.params.id },
      });
    });
  } catch (error) {
    console.error("[ADMIN_CLIENT_DELETE] Error:", error);
    return NextResponse.json(
      {
        error:
          "Impossibile eliminare il cliente: sono presenti dati collegati",
      },
      { status: 409 }
    );
  }

  await logAudit({
    userId: session.user.id,
    action: "CLIENT_TOGGLE_STATUS",
    entityType: "Client",
    entityId: context.params.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ ok: true });
}
