import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendAutoEmail } from "@/lib/email-service";
import { passwordResetRequestTemplate } from "@/lib/email-templates";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  let payload: { email: string } | null = null;
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (user) {
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;
    await sendAutoEmail({
      emailType: "PASSWORD_RESET_REQUEST",
      recipientEmail: payload.email,
      recipientName: user.email,
      recipientId: user.id,
      subject: "Reimposta la tua password — Sapienta",
      html: passwordResetRequestTemplate(resetUrl),
      meta: {
        userId: user.id,
        resetToken,
      },
    });
  }

  return NextResponse.json({
    message:
      "Se l'email esiste, riceverai le istruzioni per il reset della password.",
  });
}
