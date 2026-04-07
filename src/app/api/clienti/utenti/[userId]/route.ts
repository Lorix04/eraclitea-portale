import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isClientOwner, logClientActivity } from "@/lib/client-users";

export const dynamic = "force-dynamic";

// DELETE — Remove user from client
export async function DELETE(
  _request: Request,
  context: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = session.user.clientId;
  const targetUserId = context.params.userId;

  // Must be owner
  const owner = await isClientOwner(session.user.id, clientId);
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo rimuovere amministratori" },
      { status: 403 }
    );
  }

  // Cannot remove self
  if (targetUserId === session.user.id) {
    return NextResponse.json(
      { error: "Non puoi rimuovere te stesso. Trasferisci prima la proprieta ad un altro amministratore." },
      { status: 400 }
    );
  }

  const targetCu = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId: targetUserId } },
    include: { user: { select: { email: true } } },
  });

  if (!targetCu || targetCu.status !== "ACTIVE") {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientUser.update({
      where: { clientId_userId: { clientId, userId: targetUserId } },
      data: { status: "INACTIVE" },
    });
    await tx.user.update({
      where: { id: targetUserId },
      data: { clientId: null },
    });
  });

  await logClientActivity({
    clientId,
    userId: session.user.id,
    action: "USER_REMOVED",
    details: { removedEmail: targetCu.user.email },
  });

  return NextResponse.json({ success: true });
}
