import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: {
      client: { select: { ragioneSociale: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  }

  if (invite.status !== "PENDING") {
    const label =
      invite.status === "ACCEPTED"
        ? "gia accettato"
        : invite.status === "REVOKED"
          ? "revocato"
          : "scaduto";
    return NextResponse.json(
      { error: `Invito ${label}` },
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

  return NextResponse.json({
    clientName: invite.client.ragioneSociale,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
    status: invite.status,
  });
}
