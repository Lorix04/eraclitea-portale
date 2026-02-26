import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import { adminResetPasswordTemplate } from "@/lib/email-templates";
import { getClientIP, logAudit } from "@/lib/audit";

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        ragioneSociale: true,
        referenteNome: true,
        users: {
          where: { role: "CLIENT" },
          select: { id: true, email: true },
          take: 1,
        },
      },
    });

    if (!client || client.users.length === 0) {
      return NextResponse.json(
        { error: "Utente cliente non trovato" },
        { status: 404 }
      );
    }

    const user = client.users[0];
    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    const sent = await send({
      to: user.email,
      subject: "La tua password è stata reimpostata — Sapienta",
      html: adminResetPasswordTemplate({
        clientName: client.referenteNome || client.ragioneSociale,
        email: user.email,
        newPassword,
      }),
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Password aggiornata ma invio email non riuscito" },
        { status: 500 }
      );
    }

    await logAudit({
      userId: session.user.id,
      action: "PASSWORD_RESET",
      entityType: "User",
      entityId: user.id,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      newPassword,
      email: user.email,
      clientName: client.ragioneSociale,
    });
  } catch (error) {
    console.error("[ADMIN_CLIENT_RESET_PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
