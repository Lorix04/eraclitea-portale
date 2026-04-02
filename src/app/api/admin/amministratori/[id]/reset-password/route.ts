import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { sendAutoEmail } from "@/lib/email-service";
import {
  buildEmailHtml,
  emailParagraph,
  emailInfoBox,
} from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

function generateSecurePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const parts = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];
  for (let i = parts.length; i < length; i++) {
    parts.push(all[crypto.randomInt(all.length)]);
  }
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("amministratori", "reset-password");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const targetId = context.params.id;

  // Cannot reset your own password here (use profile)
  if (targetId === session.user.id) {
    return NextResponse.json(
      { error: "Usa la pagina Profilo per cambiare la tua password" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminRole: { select: { isSystem: true } },
    },
  });

  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Amministratore non trovato" }, { status: 404 });
  }

  // Cannot reset Super Admin password unless you are Super Admin
  if (target.adminRole?.isSystem && !session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo un Super Admin puo resettare la password di un altro Super Admin" },
      { status: 403 }
    );
  }

  const plainPassword = generateSecurePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await prisma.user.update({
    where: { id: targetId },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_RESET_PASSWORD",
    entityType: "User",
    entityId: targetId,
    ipAddress: getClientIP(request),
  });

  // Send email with new password (sensitive)
  const html = buildEmailHtml({
    title: "Password resettata",
    greeting: target.name ? `Gentile ${target.name},` : "Gentile utente,",
    bodyHtml: `
      ${emailParagraph("La tua password e stata resettata da un amministratore.")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${target.email}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Nuova password:</strong> ${plainPassword}</p>
      `)}
      ${emailParagraph("Al prossimo accesso ti verra chiesto di cambiare la password.")}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${PORTAL_URL}/login`,
  });

  void sendAutoEmail({
    emailType: "WELCOME",
    recipientEmail: target.email,
    recipientName: target.name || undefined,
    recipientId: targetId,
    subject: "Password resettata — Portale Sapienta",
    html,
    ignorePreference: true,
  });

  return NextResponse.json({
    success: true,
    message: `Password resettata e inviata a ${target.email}`,
  });
}
