import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isClientOwner, logClientActivity } from "@/lib/client-users";

export const dynamic = "force-dynamic";

async function getAuthorizedTargetClientUser(params: {
  sessionUserId: string;
  sessionClientId: string;
  targetUserId: string;
}) {
  const owner = await isClientOwner(params.sessionUserId, params.sessionClientId);
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo gestire amministratori" },
      { status: 403 }
    );
  }

  if (params.targetUserId === params.sessionUserId) {
    return NextResponse.json(
      {
        error:
          "Non puoi modificare te stesso. Trasferisci prima la proprieta ad un altro amministratore.",
      },
      { status: 400 }
    );
  }

  const targetClientUser = await prisma.clientUser.findUnique({
    where: {
      clientId_userId: {
        clientId: params.sessionClientId,
        userId: params.targetUserId,
      },
    },
    include: { user: { select: { email: true } } },
  });

  if (!targetClientUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (targetClientUser.isOwner) {
    return NextResponse.json(
      { error: "Non puoi modificare il proprietario" },
      { status: 400 }
    );
  }

  return targetClientUser;
}

// PATCH - Deactivate or reactivate user for the client
export async function PATCH(
  request: Request,
  context: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: { action?: "deactivate" | "reactivate" } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action richiesta" }, { status: 400 });
  }

  const clientId = session.user.clientId;
  const targetUserId = context.params.userId;
  const targetClientUser = await getAuthorizedTargetClientUser({
    sessionUserId: session.user.id,
    sessionClientId: clientId,
    targetUserId,
  });

  if (targetClientUser instanceof NextResponse) {
    return targetClientUser;
  }

  if (body.action === "deactivate") {
    if (targetClientUser.status === "INACTIVE") {
      return NextResponse.json(
        { error: "Utente gia disattivato" },
        { status: 400 }
      );
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
      action: "USER_DEACTIVATED",
      details: { email: targetClientUser.user.email },
    });

    return NextResponse.json({
      success: true,
      message: `Amministratore ${targetClientUser.user.email} disattivato`,
    });
  }

  if (targetClientUser.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Utente gia attivo" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientUser.update({
      where: { clientId_userId: { clientId, userId: targetUserId } },
      data: { status: "ACTIVE" },
    });
    await tx.user.update({
      where: { id: targetUserId },
      data: { clientId },
    });
  });

  await logClientActivity({
    clientId,
    userId: session.user.id,
    action: "USER_REACTIVATED",
    details: { email: targetClientUser.user.email },
  });

  return NextResponse.json({
    success: true,
    message: `Amministratore ${targetClientUser.user.email} riattivato`,
  });
}

// DELETE - Hard remove user from client
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
  const targetClientUser = await getAuthorizedTargetClientUser({
    sessionUserId: session.user.id,
    sessionClientId: clientId,
    targetUserId,
  });

  if (targetClientUser instanceof NextResponse) {
    return targetClientUser;
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientUser.delete({
      where: { clientId_userId: { clientId, userId: targetUserId } },
    });
    await tx.user.update({
      where: { id: targetUserId },
      data: { clientId: null },
    });
  });

  await logClientActivity({
    clientId,
    userId: session.user.id,
    action: "USER_DELETED",
    details: { removedEmail: targetClientUser.user.email },
  });

  return NextResponse.json({
    success: true,
    message: `Amministratore ${targetClientUser.user.email} eliminato`,
  });
}
