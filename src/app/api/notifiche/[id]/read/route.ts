import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationId_clientId: {
        notificationId: context.params.id,
        clientId: session.user.clientId,
      },
    },
    update: { readAt: new Date() },
    create: {
      notificationId: context.params.id,
      clientId: session.user.clientId,
    },
  });

  return NextResponse.json({ success: true });
}
