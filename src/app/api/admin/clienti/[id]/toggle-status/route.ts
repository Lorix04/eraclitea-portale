import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: context.params.id },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextStatus = !client.isActive;

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: client.id },
      data: { isActive: nextStatus },
    });

    await tx.user.updateMany({
      where: { clientId: client.id, role: "CLIENT" },
      data: { isActive: nextStatus },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "CLIENT_TOGGLE_STATUS",
    entityType: "Client",
    entityId: client.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ isActive: nextStatus });
}
