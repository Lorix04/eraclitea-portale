import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

function parseFromAddress(from: string): { senderName: string; senderEmail: string } {
  const raw = from.trim();
  const match = raw.match(/^\s*"?([^"]+?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      senderName: match[1].trim() || "Sapienta",
      senderEmail: match[2].trim(),
    };
  }
  return {
    senderName: "Sapienta",
    senderEmail: raw,
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const count = await prisma.emailAccount.count();
  if (count > 0) {
    return NextResponse.json(
      { error: "Ci sono gia account configurati" },
      { status: 400 }
    );
  }

  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT || "587";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return NextResponse.json(
      { error: "Variabili SMTP non trovate nel .env" },
      { status: 404 }
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return NextResponse.json(
      { error: "SMTP_PORT non valida nel .env" },
      { status: 400 }
    );
  }

  const { senderName, senderEmail } = parseFromAddress(from);

  let encryptedPass: string;
  try {
    encryptedPass = encrypt(pass);
  } catch (error) {
    console.error("Errore crittografia password SMTP:", error);
    return NextResponse.json(
      { error: "ENCRYPTION_KEY non configurata o non valida" },
      { status: 500 }
    );
  }

  const account = await prisma.emailAccount.create({
    data: {
      name: "Account Principale",
      senderName,
      senderEmail,
      smtpHost: host,
      smtpPort: port,
      smtpUser: user,
      smtpPass: encryptedPass,
      smtpSecure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      isDefault: true,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      senderName: true,
      senderEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpSecure: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const count = await prisma.emailAccount.count();
  const hasEnvConfig = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

  return NextResponse.json({
    canImport: count === 0 && hasEnvConfig,
    hasEnvConfig,
    hasAccounts: count > 0,
  });
}
