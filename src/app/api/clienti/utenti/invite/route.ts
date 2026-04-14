import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { isClientOwner, canAddUser, logClientActivity } from "@/lib/client-users";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph, emailInfoBox } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const effectiveClient = await getEffectiveClientContext();
  if (!session || !effectiveClient) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = effectiveClient.clientId;

  // Must be owner (or admin impersonating)
  const owner = effectiveClient.isImpersonating || await isClientOwner(effectiveClient.userId, clientId);
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo invitare amministratori" },
      { status: 403 }
    );
  }

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await prisma.clientUser.findFirst({
    where: {
      clientId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
    select: { status: true },
  });
  if (existingMember) {
    return NextResponse.json(
      {
        error:
          existingMember.status === "INACTIVE"
            ? "Questo amministratore e disattivato. Riattivalo dalla lista."
            : "Questo amministratore e gia associato",
      },
      { status: 409 }
    );
  }

  // Check limit (skip for resends of pending invites)
  const existingInvite = await prisma.clientInvite.findUnique({
    where: { clientId_email: { clientId, email } },
  });
  const isResend = existingInvite?.status === "PENDING";

  if (!isResend) {
    const limit = await canAddUser(clientId);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Limite amministratori raggiunto (${limit.current}/${limit.max})` },
        { status: 400 }
      );
    }
  }

  // Get client name
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { ragioneSociale: true },
  });
  const ownerUser = await prisma.user.findUnique({
    where: { id: effectiveClient.userId },
    select: { name: true, email: true },
  });

  // Create or update invite (regenerates token on resend, invalidating old link)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newToken = crypto.randomUUID();
  const invite = await prisma.clientInvite.upsert({
    where: { clientId_email: { clientId, email } },
    create: {
      clientId,
      email,
      invitedBy: effectiveClient.userId,
      expiresAt,
    },
    update: {
      token: newToken,
      status: "PENDING",
      expiresAt,
      invitedBy: effectiveClient.userId,
      acceptedAt: null,
    },
  });

  // Send email
  const html = buildEmailHtml({
    title: `Invito a ${client?.ragioneSociale || "Sapienta"}`,
    greeting: "Ciao,",
    bodyHtml: `
      ${emailParagraph(`${ownerUser?.name || ownerUser?.email || "Un amministratore"} ti ha invitato come amministratore di <strong>${client?.ragioneSociale || "un'azienda"}</strong> su Portale Sapienta.`)}
      ${emailInfoBox(`<p style="margin:0; font-size:14px;">L'invito scade il ${expiresAt.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}.</p>`)}
    `,
    ctaText: "Accetta invito",
    ctaUrl: `${PORTAL_URL}/invito-client?token=${invite.token}`,
    footerNote: "Se non conosci il mittente, ignora questa email.",
  });

  void sendAutoEmail({
    emailType: "GENERIC",
    recipientEmail: email,
    subject: `Invito a ${client?.ragioneSociale || "Sapienta"} — Portale Sapienta`,
    html,
    ignorePreference: true,
  });

  await logClientActivity({
    clientId,
    userId: effectiveClient.userId,
    action: "USER_INVITED",
    details: { email },
  });

  return NextResponse.json({
    success: true,
    message: isResend ? `Invito reinviato a ${email}` : `Invito inviato a ${email}`,
    resent: isResend,
  });
}
