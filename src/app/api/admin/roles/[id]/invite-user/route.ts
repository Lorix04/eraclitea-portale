import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { sendAutoEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  try {
    const roleId = context.params.id;
    const body = await request.json();
    const { name, email } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Nome e email sono obbligatori" },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();

    // Verify role exists
    const role = await prisma.adminRole.findUnique({
      where: { id: roleId },
      select: { id: true, name: true },
    });
    if (!role) {
      return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existingUser) {
      if (existingUser.role === "ADMIN") {
        return NextResponse.json(
          { error: "Esiste già un amministratore con questa email" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Questa email è già associata a un account ${existingUser.role === "CLIENT" ? "cliente" : "docente"}` },
        { status: 409 }
        );
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    // Create user with pending invite
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash: "", // will be set during registration
        role: "ADMIN",
        adminRoleId: roleId,
        isActive: true,
        adminInviteToken: token,
        adminInviteTokenExpiry: expiry,
        adminInviteSentAt: new Date(),
        adminInviteStatus: "pending",
      },
    });

    // Send invite email
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sapienta.it";
    const registrationUrl = `${baseUrl}/registrazione/admin/${token}`;

    await sendAutoEmail({
      emailType: "ADMIN_INVITE",
      recipientEmail: emailLower,
      recipientName: name.trim(),
      subject: "Invito al Portale Sapienta — Area Amministrazione",
      html: buildInviteHtml(name.trim(), role.name, registrationUrl),
      text: `Gentile ${name.trim()}, sei stato invitato al Portale Sapienta come ${role.name}. Completa la registrazione: ${registrationUrl}`,
      ignorePreference: true,
      meta: { userId: user.id, roleId, roleName: role.name },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: `Invito inviato a ${emailLower}`,
    });
  } catch (error) {
    console.error("[INVITE_ADMIN] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

function buildInviteHtml(name: string, roleName: string, url: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h2 style="color:#1a1a1a;margin:0">Portale Sapienta</h2>
    <p style="color:#888;font-size:13px;margin:4px 0 0">Area Amministrazione</p>
  </div>
  <p>Gentile <strong>${name}</strong>,</p>
  <p>sei stato invitato ad accedere al <strong>Portale Sapienta</strong> come amministratore con il ruolo di <strong>${roleName}</strong>.</p>
  <p>Per completare la registrazione e impostare la tua password, clicca sul pulsante seguente:</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${url}" style="background-color:#EAB308;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
      Completa la registrazione
    </a>
  </div>
  <p style="font-size:13px;color:#666">oppure copia questo link nel browser:</p>
  <p style="font-size:12px;color:#999;word-break:break-all">${url}</p>
  <p style="font-size:13px;color:#666">Il link è valido per <strong>7 giorni</strong>.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#999">Per qualsiasi domanda, contatta la segreteria all'indirizzo segreteria@sapienta.it</p>
  <p style="font-size:12px;color:#999">Cordiali saluti,<br>Accademia Eraclitea</p>
</div>`;
}
