import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  if (isAdminView) {
    return NextResponse.json({ success: true });
  }

  if (!effectiveClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationId_clientId: {
        notificationId: context.params.id,
        clientId: effectiveClient.clientId,
      },
    },
    update: { readAt: new Date() },
    create: {
      notificationId: context.params.id,
      clientId: effectiveClient.clientId,
    },
  });

  return NextResponse.json({ success: true });
}
