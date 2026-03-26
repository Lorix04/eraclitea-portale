import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  const { session } = check as { session: any };
  const roleId = context.params.id;
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "Specifica l'utente" },
      { status: 400 }
    );
  }

  // Cannot remove yourself
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Non puoi rimuoverti dal tuo stesso ruolo. Chiedi a un altro amministratore." },
      { status: 400 }
    );
  }

  // Check the role
  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    select: { id: true, isSystem: true, name: true },
  });

  if (!role) {
    return NextResponse.json(
      { error: "Ruolo non trovato" },
      { status: 404 }
    );
  }

  // If removing from Super Admin (system role), ensure at least 1 remains
  if (role.isSystem) {
    const superAdminCount = await prisma.user.count({
      where: { adminRoleId: role.id, role: "ADMIN" },
    });

    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Non puoi rimuovere l'ultimo Super Admin. Deve esserci sempre almeno un Super Admin." },
        { status: 400 }
      );
    }
  }

  // Set adminRoleId to null — user loses all access until reassigned
  await prisma.user.update({
    where: { id: userId },
    data: { adminRoleId: null },
  });

  return NextResponse.json({ success: true });
}
