import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const target = await prisma.emailAccount.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.emailAccount.updateMany({ data: { isDefault: false } }),
    prisma.emailAccount.update({
      where: { id: params.id },
      data: { isDefault: true },
    }),
  ]);

  const account = await prisma.emailAccount.findUnique({
    where: { id: params.id },
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
}
