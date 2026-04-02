import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const check = await requirePermission("docenti", "edit");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const inconsistent = await prisma.teacher.findMany({
    where: {
      status: { in: ["ACTIVE", "ONBOARDING"] },
      userId: null,
    },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  let fixed = 0;

  for (const teacher of inconsistent) {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { status: "INACTIVE" },
    });

    await logAudit({
      userId: session.user.id,
      action: "TEACHER_INTEGRITY_FIX",
      entityType: "Teacher",
      entityId: teacher.id,
      ipAddress: getClientIP(request),
    });

    fixed++;
  }

  return NextResponse.json({ fixed, total: inconsistent.length });
}
