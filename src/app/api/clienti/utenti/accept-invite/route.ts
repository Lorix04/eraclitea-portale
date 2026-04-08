import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAddUser, logClientActivity } from "@/lib/client-users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Devi essere autenticato" }, { status: 401 });
  }

  let body: { token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  const invite = await prisma.clientInvite.findUnique({
    where: { token: body.token },
    include: {
      client: { select: { ragioneSociale: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  }

  if (invite.status !== "PENDING") {
    return NextResponse.json(
      { error: `Invito gia ${invite.status === "ACCEPTED" ? "accettato" : invite.status === "REVOKED" ? "revocato" : "scaduto"}` },
      { status: 400 }
    );
  }

  if (new Date() > invite.expiresAt) {
    await prisma.clientInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Invito scaduto" }, { status: 400 });
  }

  // Email must match
  if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Questo invito e per un altro indirizzo email" },
      { status: 403 }
    );
  }

  // Check if already member
  const existing = await prisma.clientUser.findUnique({
    where: {
      clientId_userId: { clientId: invite.clientId, userId: session.user.id },
    },
  });
  if (existing?.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Sei gia associato a questo client" },
      { status: 409 }
    );
  }

  if (!existing) {
    const limit = await canAddUser(invite.clientId);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Il limite amministratori e stato raggiunto" },
        { status: 400 }
      );
    }
  }

  // Accept
  await prisma.$transaction(async (tx) => {
    // Create or reactivate ClientUser
    await tx.clientUser.upsert({
      where: {
        clientId_userId: { clientId: invite.clientId, userId: session.user.id },
      },
      create: {
        clientId: invite.clientId,
        userId: session.user.id,
        isOwner: false,
        invitedBy: invite.invitedBy,
        status: "ACTIVE",
      },
      update: {
        status: "ACTIVE",
        invitedBy: invite.invitedBy,
      },
    });

    // Sync User.clientId
    await tx.user.update({
      where: { id: session.user.id },
      data: { clientId: invite.clientId },
    });

    // Mark invite accepted
    await tx.clientInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  });

  await logClientActivity({
    clientId: invite.clientId,
    userId: session.user.id,
    action: "USER_JOINED",
    details: { email: invite.email },
  });

  return NextResponse.json({
    success: true,
    clientName: invite.client.ragioneSociale,
    redirectTo: "/dashboard",
  });
}
