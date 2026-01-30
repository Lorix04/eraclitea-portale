import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import { passwordResetTemplate } from "@/lib/email-templates";
import { getClientIP, logAudit } from "@/lib/audit";

function generateTempPassword() {
  return `Temp${Math.random().toString(36).slice(-8)}!`;
}

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { clientId: context.params.id, role: "CLIENT" },
  });

  if (!user) {
    return NextResponse.json({ error: "User non trovato" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await send({
    to: user.email,
    subject: "Reset Password - Portale Formazione",
    html: passwordResetTemplate(tempPassword),
  });

  await logAudit({
    userId: session.user.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    ipAddress: getClientIP(_request),
  });

  return NextResponse.json({ tempPassword });
}
