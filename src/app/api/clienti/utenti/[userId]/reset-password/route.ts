import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { isClientOwner, logClientActivity } from "@/lib/client-users";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph, emailInfoBox } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const special = "!@#$%&*";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  password += Math.floor(Math.random() * 10);
  return password;
}

export async function POST(
  _request: Request,
  context: { params: { userId: string } }
) {
  const effectiveClient = await getEffectiveClientContext();
  if (!effectiveClient) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = effectiveClient.clientId;
  const owner =
    effectiveClient.isImpersonating ||
    (await isClientOwner(effectiveClient.userId, clientId));
  if (!owner) {
    return NextResponse.json(
      { error: "Solo il proprietario puo resettare le password" },
      { status: 403 }
    );
  }

  // Verify target user belongs to this client and is not the owner
  const targetClientUser = await prisma.clientUser.findUnique({
    where: {
      clientId_userId: { clientId, userId: context.params.userId },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!targetClientUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (targetClientUser.isOwner) {
    return NextResponse.json(
      { error: "Non puoi resettare la password del proprietario" },
      { status: 403 }
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: targetClientUser.userId },
    data: { passwordHash, mustChangePassword: true },
  });

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { ragioneSociale: true },
  });

  const portalUrl = process.env.NEXTAUTH_URL || "https://sapienta.it";
  const html = buildEmailHtml({
    title: "Password reimpostata",
    greeting: `Gentile ${targetClientUser.user.name || targetClientUser.user.email},`,
    bodyHtml: `
      ${emailParagraph(`La tua password per accedere a <strong>${client?.ragioneSociale || "Portale Sapienta"}</strong> e stata reimpostata.`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${targetClientUser.user.email}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${tempPassword}</p>
      `)}
      ${emailParagraph("Per la tua sicurezza, al prossimo accesso ti verra chiesto di scegliere una nuova password.")}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${portalUrl}/login`,
  });

  const emailSent = await sendAutoEmail({
    emailType: "PASSWORD_RESET_ADMIN",
    recipientEmail: targetClientUser.user.email,
    recipientName: targetClientUser.user.name ?? undefined,
    recipientId: targetClientUser.userId,
    subject: `Password reimpostata - ${client?.ragioneSociale || "Sapienta"}`,
    html,
    ignorePreference: true,
  });

  await logClientActivity({
    clientId,
    userId: effectiveClient.userId,
    action: "PASSWORD_RESET",
    details: { targetEmail: targetClientUser.user.email },
  });

  return NextResponse.json({
    success: true,
    emailSent,
    tempPassword: emailSent ? undefined : tempPassword,
  });
}
