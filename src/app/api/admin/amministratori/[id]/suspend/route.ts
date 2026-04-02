import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("amministratori", "suspend");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const targetId = context.params.id;

  // Cannot suspend yourself
  if (targetId === session.user.id) {
    return NextResponse.json(
      { error: "Non puoi sospendere il tuo stesso account" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      adminRole: { select: { isSystem: true } },
    },
  });

  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Amministratore non trovato" }, { status: 404 });
  }

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  // Cannot suspend a Super Admin unless you are Super Admin
  if (target.adminRole?.isSystem && !session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo un Super Admin puo sospendere un altro Super Admin" },
      { status: 403 }
    );
  }

  if (body.action === "suspend") {
    if (!target.isActive) {
      return NextResponse.json({ error: "Account gia sospeso" }, { status: 400 });
    }

    // Cannot suspend the last active Super Admin
    if (target.adminRole?.isSystem) {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: "ADMIN",
          isActive: true,
          adminRole: { isSystem: true },
        },
      });
      if (activeSuperAdmins <= 1) {
        return NextResponse.json(
          { error: "Impossibile sospendere l'ultimo Super Admin attivo" },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id: targetId },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedById: session.user.id,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "ADMIN_SUSPEND",
      entityType: "User",
      entityId: targetId,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "Account sospeso" });
  }

  if (body.action === "reactivate") {
    if (target.isActive) {
      return NextResponse.json({ error: "Account gia attivo" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: targetId },
      data: {
        isActive: true,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "ADMIN_REACTIVATE",
      entityType: "User",
      entityId: targetId,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "Account riattivato" });
  }

  return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
}
