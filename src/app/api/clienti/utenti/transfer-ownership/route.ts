import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isClientOwner, logClientActivity } from "@/lib/client-users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = session.user.clientId;

  const owner = await isClientOwner(session.user.id, clientId);
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo trasferire la proprieta" },
      { status: 403 }
    );
  }

  let body: { newOwnerId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.newOwnerId) {
    return NextResponse.json({ error: "newOwnerId richiesto" }, { status: 400 });
  }

  if (body.newOwnerId === session.user.id) {
    return NextResponse.json({ error: "Sei gia il proprietario" }, { status: 400 });
  }

  const newOwnerCu = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId: body.newOwnerId } },
  });
  if (!newOwnerCu || newOwnerCu.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "L'utente selezionato non e un membro attivo" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Remove old owner
    await tx.clientUser.update({
      where: { clientId_userId: { clientId, userId: session.user.id } },
      data: { isOwner: false },
    });
    // Set new owner
    await tx.clientUser.update({
      where: { clientId_userId: { clientId, userId: body.newOwnerId! } },
      data: { isOwner: true },
    });
  });

  await logClientActivity({
    clientId,
    userId: session.user.id,
    action: "OWNERSHIP_TRANSFERRED",
    details: { newOwnerId: body.newOwnerId },
  });

  return NextResponse.json({ success: true });
}
