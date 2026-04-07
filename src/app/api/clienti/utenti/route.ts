import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = session.user.clientId;

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
      current: activeCount,
      max: client?.maxUsers ?? null,
    },
    clientName: client?.ragioneSociale ?? "",
  });
}
