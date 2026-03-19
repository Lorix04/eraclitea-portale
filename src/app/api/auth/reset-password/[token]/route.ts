import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PASSWORD_REGEX } from "@/lib/security";

const resetSchema = z.object({
  password: z
    .string()
    .min(8, "La password deve avere almeno 8 caratteri")
    .regex(
      PASSWORD_REGEX,
      "La password deve contenere maiuscola, numero e carattere speciale"
    ),
});

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: params.token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  return NextResponse.json({ valid: true, email: user.email });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const body = await request.json().catch(() => null);
  const validation = resetSchema.safeParse(body);

  if (!validation.success) {
    const msg =
      validation.error.errors[0]?.message || "Password non valida";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(validation.data.password, 12);

  // Atomic: updateMany with token filter prevents race conditions
  const result = await prisma.user.updateMany({
    where: {
      resetToken: params.token,
      resetTokenExpiry: { gt: new Date() },
    },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Token non valido o scaduto" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
