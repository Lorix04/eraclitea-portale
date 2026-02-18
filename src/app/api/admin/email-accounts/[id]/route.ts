import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

const updateSchema = z.object({
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
  smtpPass: z.string().optional(),
  smtpSecure: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true"),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Dati non validi";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;
  const updateData: Prisma.EmailAccountUpdateInput = {
    name: data.name,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    smtpHost: data.smtpHost,
    smtpPort: data.smtpPort,
    smtpUser: data.smtpUser,
    smtpSecure: data.smtpSecure,
    ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
  };

  if (data.smtpPass && data.smtpPass.trim() !== "") {
    try {
      updateData.smtpPass = encrypt(data.smtpPass);
    } catch (error) {
      console.error("Errore crittografia password SMTP:", error);
      return NextResponse.json(
        { error: "ENCRYPTION_KEY non configurata o non valida" },
        { status: 500 }
      );
    }
  }

  try {
    const account = await prisma.emailAccount.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(account);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const account = await prisma.emailAccount.findUnique({
    where: { id: params.id },
    select: { id: true, isDefault: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  }

  if (account.isDefault) {
    return NextResponse.json(
      {
        error:
          "Non puoi eliminare l'account predefinito. Imposta prima un altro account come predefinito.",
      },
      { status: 400 }
    );
  }

  await prisma.emailAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
