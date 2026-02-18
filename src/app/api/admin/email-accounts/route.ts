import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

const createSchema = z.object({
  name: z.string().trim().min(1, "Nome account obbligatorio"),
  senderName: z.string().trim().min(1, "Nome mittente obbligatorio"),
  senderEmail: z.string().trim().email("Email mittente non valida"),
  smtpHost: z.string().trim().min(1, "Host SMTP obbligatorio"),
  smtpPort: z.coerce
    .number()
    .int("Porta SMTP non valida")
    .min(1, "Porta SMTP non valida")
    .max(65535, "Porta SMTP non valida"),
  smtpUser: z.string().trim().min(1, "Utente SMTP obbligatorio"),
  smtpPass: z.string().min(1, "Password SMTP obbligatoria"),
  smtpSecure: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true"),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const accounts = await prisma.emailAccount.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
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

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Dati non validi";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  let encryptedPass: string;
  try {
    encryptedPass = encrypt(data.smtpPass);
  } catch (error) {
    console.error("Errore crittografia password SMTP:", error);
    return NextResponse.json(
      { error: "ENCRYPTION_KEY non configurata o non valida" },
      { status: 500 }
    );
  }

  const count = await prisma.emailAccount.count();
  const isDefault = count === 0;

  const account = await prisma.emailAccount.create({
    data: {
      name: data.name,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      smtpPass: encryptedPass,
      smtpSecure: data.smtpSecure,
      isDefault,
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
