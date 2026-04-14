import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { isClientOwner } from "@/lib/client-users";

export const dynamic = "force-dynamic";

// DELETE — revoke a pending invite
export async function DELETE(
  _request: Request,
  context: { params: { inviteId: string } }
) {
  const effectiveClient = await getEffectiveClientContext();
  if (!effectiveClient) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const owner =
    effectiveClient.isImpersonating ||
    (await isClientOwner(effectiveClient.userId, effectiveClient.clientId));
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo revocare inviti" },
      { status: 403 }
    );
  }

  const invite = await prisma.clientInvite.findUnique({
    where: { id: context.params.inviteId },
  });

  if (!invite || invite.clientId !== effectiveClient.clientId) {
    return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  }

  if (invite.status !== "PENDING") {
    return NextResponse.json(
      { error: "Solo inviti in attesa possono essere revocati" },
      { status: 400 }
    );
  }

  await prisma.clientInvite.update({
    where: { id: invite.id },
    data: { status: "REVOKED" },
  });

  return NextResponse.json({ success: true });
}
