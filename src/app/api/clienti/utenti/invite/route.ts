import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { isClientOwner, canAddUser, logClientActivity } from "@/lib/client-users";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph, emailInfoBox } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const effectiveClient = await getEffectiveClientContext();
  if (!session || !effectiveClient) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const clientId = effectiveClient.clientId;

  // Must be owner (or admin impersonating)
  const owner =
    effectiveClient.isImpersonating ||
    (await isClientOwner(effectiveClient.userId, clientId));
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

  // Check if already a member of this client
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
        {
          error: `Limite amministratori raggiunto (${limit.current}/${limit.max})`,
        },
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
  const clientName = client?.ragioneSociale || "Sapienta";
  const ownerName =
    ownerUser?.name || ownerUser?.email || "Un amministratore";

  // Check if user already exists in the system
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  // === CASE A: New user — create account with temp password ===
  if (!existingUser) {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "CLIENT",
          clientId,
          isActive: true,
          mustChangePassword: true,
        },
      });

      await tx.clientUser.create({
        data: {
          clientId,
          userId: user.id,
          isOwner: false,
          invitedBy: effectiveClient.userId,
          status: "ACTIVE",
        },
      });

      // Create invite record as ACCEPTED (auto-accepted since account was created)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tx.clientInvite.upsert({
        where: { clientId_email: { clientId, email } },
        create: {
          clientId,
          email,
          invitedBy: effectiveClient.userId,
          expiresAt,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
        update: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          invitedBy: effectiveClient.userId,
        },
      });

      return user;
    });

    // Send email with credentials
    const html = buildEmailHtml({
      title: `Benvenuto su ${clientName}`,
      greeting: "Ciao,",
      bodyHtml: `
        ${emailParagraph(`${ownerName} ti ha invitato come amministratore di <strong>${clientName}</strong> su Portale Sapienta.`)}
        ${emailParagraph("Ecco le tue credenziali per accedere:")}
        ${emailInfoBox(`
          <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${email}</p>
          <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${tempPassword}</p>
        `)}
        ${emailParagraph("Per la tua sicurezza, al primo accesso ti verra chiesto di scegliere una nuova password.")}
      `,
      ctaText: "Accedi al Portale",
      ctaUrl: `${PORTAL_URL}/login`,
      footerNote:
        "Se non conosci il mittente, ignora questa email.",
    });

    const emailSent = await sendAutoEmail({
      emailType: "WELCOME",
      recipientEmail: email,
      recipientName: email,
      recipientId: newUser.id,
      subject: `Sei stato invitato su ${clientName} — Le tue credenziali`,
      html,
      ignorePreference: true,
    });

    await logClientActivity({
      clientId,
      userId: effectiveClient.userId,
      action: "USER_INVITED",
      details: { email, isNewUser: true },
    });

    return NextResponse.json({
      success: true,
      isNewUser: true,
      emailSent,
      // If SMTP failed, return temp password so the owner can communicate it manually
      tempPassword: emailSent ? undefined : tempPassword,
      message: `Account creato per ${email}. ${emailSent ? "Le credenziali temporanee sono state inviate via email." : "ATTENZIONE: l'email non e stata inviata. Comunica la password temporanea in modo sicuro."}`,
    });
  }

  // === CASE B: Existing user — send invite link ===
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

  // Send invite email
  const html = buildEmailHtml({
    title: `Invito a ${clientName}`,
    greeting: "Ciao,",
    bodyHtml: `
      ${emailParagraph(`${ownerName} ti ha invitato come amministratore di <strong>${clientName}</strong> su Portale Sapienta.`)}
      ${emailInfoBox(`<p style="margin:0; font-size:14px;">L'invito scade il ${expiresAt.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}.</p>`)}
    `,
    ctaText: "Accetta invito",
    ctaUrl: `${PORTAL_URL}/invito-client?token=${invite.token}`,
    footerNote: "Se non conosci il mittente, ignora questa email.",
  });

  void sendAutoEmail({
    emailType: "GENERIC",
    recipientEmail: email,
    subject: `Invito a ${clientName} — Portale Sapienta`,
    html,
    ignorePreference: true,
  });

  await logClientActivity({
    clientId,
    userId: effectiveClient.userId,
    action: "USER_INVITED",
    details: { email, isNewUser: false },
  });

  return NextResponse.json({
    success: true,
    isNewUser: false,
    message: isResend
      ? `Invito reinviato a ${email}`
      : `Invito inviato a ${email}. L'utente ricevera un'email con il link per accettare.`,
    resent: isResend,
  });
}
