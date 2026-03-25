import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { sendAutoEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: { userId: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.params.userId },
      include: { adminRole: { select: { name: true } } },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (user.adminInviteStatus !== "pending") {
      return NextResponse.json(
        { error: "L'utente ha già completato la registrazione" },
        { status: 400 }
      );
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        adminInviteToken: token,
        adminInviteTokenExpiry: expiry,
        adminInviteSentAt: new Date(),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sapienta.it";
    const registrationUrl = `${baseUrl}/registrazione/admin/${token}`;
    const roleName = user.adminRole?.name ?? "Amministratore";

    await sendAutoEmail({
      emailType: "ADMIN_INVITE",
      recipientEmail: user.email,
      recipientName: user.email,
      subject: "Invito al Portale Sapienta — Area Amministrazione (promemoria)",
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h2 style="color:#1a1a1a;margin:0">Portale Sapienta</h2>
  </div>
  <p>Questo è un promemoria: sei stato invitato al <strong>Portale Sapienta</strong> come <strong>${roleName}</strong>.</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${registrationUrl}" style="background-color:#EAB308;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
      Completa la registrazione
    </a>
  </div>
  <p style="font-size:13px;color:#666">Il link è valido per <strong>7 giorni</strong>.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#999">Cordiali saluti,<br>Accademia Eraclitea</p>
</div>`,
      text: `Promemoria: sei stato invitato al Portale Sapienta. Registrati: ${registrationUrl}`,
      ignorePreference: true,
      meta: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: `Invito reinviato a ${user.email}`,
    });
  } catch (error) {
    console.error("[REINVITE_ADMIN] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { userId: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.params.userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (user.adminInviteStatus !== "pending" || user.passwordHash) {
      return NextResponse.json(
        { error: "Impossibile annullare: l'utente ha già completato la registrazione" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id: user.id } });

    return NextResponse.json({ success: true, message: "Invito annullato" });
  } catch (error) {
    console.error("[CANCEL_ADMIN_INVITE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
