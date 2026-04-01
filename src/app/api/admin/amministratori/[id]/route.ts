import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, checkApiPermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ─── GET — User detail ──────────────────────────────────────
export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("amministratori", "view");
  if (check instanceof NextResponse) return check;

  const user = await prisma.user.findUnique({
    where: { id: context.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      mustChangePassword: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      adminRoleId: true,
      adminRole: {
        select: {
          id: true,
          name: true,
          isSystem: true,
          permissions: true,
        },
      },
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          piva: true,
          logoPath: true,
          isActive: true,
          hasCustomFields: true,
          _count: {
            select: {
              employees: true,
              editions: true,
            },
          },
        },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          mobile: true,
          province: true,
          region: true,
          status: true,
          fiscalCode: true,
          birthDate: true,
          birthPlace: true,
          gender: true,
          address: true,
          city: true,
          postalCode: true,
          specialization: true,
          profession: true,
          vatNumber: true,
          pec: true,
          createdAt: true,
          _count: {
            select: {
              assignments: true,
              workExperiences: true,
              educations: true,
            },
          },
          categories: {
            select: { id: true, name: true, color: true },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utente non trovato" },
      { status: 404 }
    );
  }

  // Fetch recent audit logs for this user
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      ipAddress: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: { ...user, auditLogs } });
}

// ─── DELETE — Delete user permanently ────────────────────────
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("amministratori", "delete");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  // Must be Super Admin
  if (!session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo il Super Admin puo eliminare utenti" },
      { status: 403 }
    );
  }

  // Parse confirm text
  let body: { confirmText?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body non valido" },
      { status: 400 }
    );
  }

  const targetId = context.params.id;

  // Cannot delete self
  if (targetId === session.user.id) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo stesso account" },
      { status: 400 }
    );
  }

  // Fetch user to delete
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      role: true,
      adminRoleId: true,
      clientId: true,
      adminRole: { select: { isSystem: true } },
      teacher: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utente non trovato" },
      { status: 404 }
    );
  }

  // Confirm text must match email
  if (!body.confirmText || body.confirmText.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "L'email di conferma non corrisponde" },
      { status: 400 }
    );
  }

  // Cannot delete the last Super Admin
  if (user.adminRole?.isSystem) {
    const superAdminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        adminRole: { isSystem: true },
      },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Impossibile eliminare l'ultimo Super Admin" },
        { status: 400 }
      );
    }
  }

  // Log BEFORE deleting (so audit references still work)
  await logAudit({
    userId: session.user.id,
    action: "USER_DELETE",
    entityType: "User",
    entityId: targetId,
    ipAddress: getClientIP(request),
  });

  // Delete in transaction
  await prisma.$transaction(async (tx) => {
    // If TEACHER, clean up teacher relations
    if (user.role === "TEACHER" && user.teacher) {
      const teacherId = user.teacher.id;
      await tx.teacherAssignment.deleteMany({ where: { teacherId } });
      await tx.teacherUnavailability.deleteMany({ where: { teacherId } });
      await tx.teacherSignedDocument.deleteMany({ where: { teacherId } });
      await tx.teacherWorkExperience.deleteMany({ where: { teacherId } });
      await tx.teacherEducation.deleteMany({ where: { teacherId } });
      await tx.teacherLanguage.deleteMany({ where: { teacherId } });
      await tx.teacherCertification.deleteMany({ where: { teacherId } });
      await tx.teacherSkill.deleteMany({ where: { teacherId } });
      await tx.teacherTrainingCourse.deleteMany({ where: { teacherId } });
      await tx.teacherTeachingExperience.deleteMany({ where: { teacherId } });
      await tx.teacherPublication.deleteMany({ where: { teacherId } });
      await tx.teacherMessage.deleteMany({ where: { teacherId } });
      await tx.ticket.deleteMany({ where: { teacherId } });
      await tx.teacher.delete({ where: { id: teacherId } });
    }

    // Clean up audit logs for this user (except our just-created log)
    await tx.auditLog.deleteMany({ where: { userId: targetId } });

    // Clean up notifications
    await tx.notification.deleteMany({ where: { userId: targetId } });

    // Clean up edition referents
    await tx.editionReferent.deleteMany({ where: { userId: targetId } });

    // Delete the user
    await tx.user.delete({ where: { id: targetId } });
  });

  return NextResponse.json({ success: true });
}

// ─── PATCH — Unlock account / Force password change ──────────
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("amministratori", "view");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  let body: { action?: string; name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body non valido" },
      { status: 400 }
    );
  }

  const targetId = context.params.id;
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utente non trovato" },
      { status: 404 }
    );
  }

  if (body.action === "unlock") {
    await prisma.user.update({
      where: { id: targetId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await logAudit({
      userId: session.user.id,
      action: "USER_UNLOCK",
      entityType: "User",
      entityId: targetId,
      ipAddress: getClientIP(request),
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "updateName") {
    await prisma.user.update({
      where: { id: targetId },
      data: { name: body.name?.trim() || null },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "forcePasswordChange") {
    await prisma.user.update({
      where: { id: targetId },
      data: { mustChangePassword: true },
    });
    await logAudit({
      userId: session.user.id,
      action: "USER_FORCE_PASSWORD_CHANGE",
      entityType: "User",
      entityId: targetId,
      ipAddress: getClientIP(request),
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Azione non riconosciuta" },
    { status: 400 }
  );
}
