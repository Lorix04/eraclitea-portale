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
  const check = await requirePermission("docenti", "edit");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const teacherId = context.params.id;

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      userId: true,
    },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
  }

  // Verify there's actually an integrity issue
  if (teacher.userId) {
    return NextResponse.json(
      { error: "Questo docente ha gia un account utente associato" },
      { status: 400 }
    );
  }

  if (body.action === "reset_and_invite") {
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        status: "INACTIVE",
        inviteToken,
        inviteTokenExpiry: inviteExpiry,
        inviteSentAt: null,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "TEACHER_INTEGRITY_FIX",
      entityType: "Teacher",
      entityId: teacherId,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "Status resettato a Inattivo. Puoi ora inviare l'invito dalla pagina del docente.",
    });
  }

  if (body.action === "create_account") {
    if (!teacher.email) {
      return NextResponse.json(
        { error: "Il docente non ha un indirizzo email configurato" },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: teacher.email, mode: "insensitive" } },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: `Esiste gia un utente con email ${teacher.email}` },
        { status: 409 }
      );
    }

    const plainPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: teacher.email!.toLowerCase().trim(),
          passwordHash,
          role: "TEACHER",
          mustChangePassword: true,
          isActive: true,
        },
      });

      await tx.teacher.update({
        where: { id: teacherId },
        data: { userId: user.id, status: "ACTIVE" },
      });
    });

    await logAudit({
      userId: session.user.id,
      action: "TEACHER_INTEGRITY_FIX",
      entityType: "Teacher",
      entityId: teacherId,
      ipAddress: getClientIP(request),
    });

    // Send credentials email (sensitive)
    const html = buildEmailHtml({
      title: "Account creato su Portale Sapienta",
      greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
      bodyHtml: `
        ${emailParagraph("E stato creato un account per te sul Portale Sapienta.")}
        ${emailInfoBox(`
          <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${teacher.email}</p>
          <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${plainPassword}</p>
        `)}
        ${emailParagraph("Al primo accesso ti verra chiesto di cambiare la password.")}
      `,
      ctaText: "Accedi al Portale",
      ctaUrl: `${PORTAL_URL}/login`,
      footerNote: "Se non hai richiesto questo account, ignora questa email.",
    });

    void sendAutoEmail({
      emailType: "WELCOME",
      recipientEmail: teacher.email!,
      recipientName: `${teacher.firstName} ${teacher.lastName}`,
      subject: "Account creato — Portale Sapienta",
      html,
      ignorePreference: true,
    });

    return NextResponse.json({
      success: true,
      message: "Account creato. Il docente ricevera le credenziali via email.",
    });
  }

  return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
}
