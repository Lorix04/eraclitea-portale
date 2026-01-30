import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const resetSchema = z.object({
  password: z.string().min(8),
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
    return NextResponse.json({ error: "Password non valida" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: params.token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Token non valido o scaduto" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(validation.data.password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({ success: true });
}
