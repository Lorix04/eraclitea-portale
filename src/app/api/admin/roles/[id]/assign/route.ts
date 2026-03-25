import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  const role = await prisma.adminRole.findUnique({
    where: { id: context.params.id },
  });

  if (!role) {
    return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
  }

  const body = await request.json();
  const { userIds } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "Specifica almeno un utente" },
      { status: 400 }
    );
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: userIds }, role: "ADMIN" },
    data: { adminRoleId: context.params.id },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
