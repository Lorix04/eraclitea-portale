import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (
    !apiKey ||
    !process.env.CRON_API_KEY ||
    !safeCompare(apiKey, process.env.CRON_API_KEY)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find Teachers ACTIVE/ONBOARDING without User
  const inconsistentTeachers = await prisma.teacher.findMany({
    where: {
      status: { in: ["ACTIVE", "ONBOARDING"] },
      userId: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  });

  // Auto-fix: reset to INACTIVE
  for (const teacher of inconsistentTeachers) {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { status: "INACTIVE" },
    });

    // Log — use first admin user for FK constraint
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (adminUser) {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: "TEACHER_AUTO_FIX",
          entityType: "Teacher",
          entityId: teacher.id,
        },
      }).catch(() => {});
    }
  }

  // Find orphan Users (TEACHER role without Teacher record)
  const orphanUsers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      teacher: null,
    },
    select: { id: true, email: true },
  });

  return NextResponse.json({
    checked: true,
    inconsistentTeachers: inconsistentTeachers.length,
    fixed: inconsistentTeachers.length,
    orphanUsers: orphanUsers.length,
    orphanUserEmails: orphanUsers.map((u) => u.email),
  });
}
