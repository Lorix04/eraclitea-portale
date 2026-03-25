import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "Specifica l'utente" },
      { status: 400 }
    );
  }

  // Assign the default role instead
  const defaultRole = await prisma.adminRole.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { adminRoleId: defaultRole?.id ?? null },
  });

  return NextResponse.json({ success: true });
}
