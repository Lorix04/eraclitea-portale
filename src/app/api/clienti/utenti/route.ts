import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function GET() {
  const effectiveClient = await getEffectiveClientContext();
  if (!effectiveClient) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = effectiveClient.clientId;

  const clientUsers = await prisma.clientUser.findMany({
    where: { clientId },
    include: {
      user: {
        select: { id: true, name: true, email: true, lastLoginAt: true },
      },
    },
    orderBy: [{ isOwner: "desc" }, { invitedAt: "asc" }],
  });

  const invites = await prisma.clientInvite.findMany({
    where: { clientId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { maxUsers: true, ragioneSociale: true },
  });

  const activeCount = clientUsers.filter((cu) => cu.status === "ACTIVE").length;
  const inactiveCount = clientUsers.filter((cu) => cu.status === "INACTIVE").length;

  return NextResponse.json({
    users: clientUsers.map((cu) => ({
      id: cu.user.id,
      name: cu.user.name,
      email: cu.user.email,
      isOwner: cu.isOwner,
      status: cu.status,
      invitedAt: cu.invitedAt,
      lastLoginAt: cu.user.lastLoginAt,
    })),
    invites: invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    })),
    limits: {
      current: clientUsers.length,
      max: client?.maxUsers ?? null,
      activeCount,
      inactiveCount,
    },
    clientName: client?.ragioneSociale ?? "",
  });
}
