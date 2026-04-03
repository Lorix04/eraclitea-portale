import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Only Super Admin can view server monitor
  if (!session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Riservato al Super Admin" }, { status: 403 });
  }

  // === HOST DATA (from JSON file) ===
  let serverData: any = null;
  try {
    const storagePath =
      process.env.FILE_STORAGE_PATH ||
      process.env.STORAGE_PATH ||
      "storage";
    const filePath = path.join(storagePath, "server-status.json");
    const raw = await readFile(filePath, "utf-8");
    serverData = JSON.parse(raw);
    const age = Date.now() - new Date(serverData.timestamp).getTime();
    serverData._age_seconds = Math.round(age / 1000);
    serverData._stale = age > 120000;
  } catch {
    serverData = {
      _error:
        "File server-status.json non trovato. Configura lo script cron sull'host.",
    };
  }

  // === APP DATA (from DB) ===
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // Email stats
    const [emailsSentToday, emailsFailed, emailsPending] = await Promise.all([
      prisma.emailLog.count({
        where: { status: "SENT", sentAt: { gte: today } },
      }),
      prisma.emailLog.count({
        where: { status: "FAILED", sentAt: { gte: today } },
      }),
      prisma.emailLog.count({
        where: {
          status: { in: ["PENDING"] },
          retryable: true,
        },
      }),
    ]);

    const [lastEmailSuccess, lastEmailFail] = await Promise.all([
      prisma.emailLog.findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true, recipientEmail: true },
      }),
      prisma.emailLog.findFirst({
        where: { status: "FAILED" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true, errorMessage: true, recipientEmail: true },
      }),
    ]);

    // Account security
    const [lockedAccounts, adminsSuspended] = await Promise.all([
      prisma.user.findMany({
        where: { lockedUntil: { gt: now } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          lastLoginAt: true,
        },
        orderBy: { lockedUntil: "desc" },
      }),
      prisma.user.count({
        where: { role: "ADMIN", isActive: false, suspendedAt: { not: null } },
      }),
    ]);

    // Active sessions (last login within 30 min — approximation)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const [activeAdmins, activeClients, activeTeachers] = await Promise.all([
      prisma.user.count({
        where: { role: "ADMIN", lastLoginAt: { gte: thirtyMinAgo } },
      }),
      prisma.user.count({
        where: { role: "CLIENT", lastLoginAt: { gte: thirtyMinAgo } },
      }),
      prisma.user.count({
        where: { role: "TEACHER", lastLoginAt: { gte: thirtyMinAgo } },
      }),
    ]);

    // CV DPR 445 stats
    const cvStats = await prisma.teacherCvDpr445.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Teacher integrity
    const teachersWithIssues = await prisma.teacher.count({
      where: { status: "ACTIVE", userId: null },
    });

    // Record counts
    const [
      totalUsers,
      totalEmployees,
      totalCourses,
      totalEditions,
      totalTeachers,
      totalClients,
      totalTickets,
      openTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.course.count(),
      prisma.courseEdition.count(),
      prisma.teacher.count(),
      prisma.client.count(),
      prisma.ticket.count(),
      prisma.ticket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);

    // Last admin logins
    const lastAdminLogins = await prisma.auditLog.findMany({
      where: { action: "LOGIN" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        ipAddress: true,
        user: { select: { name: true, email: true } },
      },
    });

    const appData = {
      email: {
        sent_today: emailsSentToday,
        in_queue: emailsPending,
        failed_today: emailsFailed,
        last_success: lastEmailSuccess,
        last_fail: lastEmailFail
          ? {
              ...lastEmailFail,
              errorMessage: lastEmailFail.errorMessage?.slice(0, 100) ?? null,
            }
          : null,
      },
      accounts: {
        locked: lockedAccounts.length,
        locked_list: lockedAccounts,
        admins_suspended: adminsSuspended,
      },
      sessions: {
        admin: activeAdmins,
        client: activeClients,
        teacher: activeTeachers,
        total: activeAdmins + activeClients + activeTeachers,
      },
      cv_dpr445: cvStats.reduce(
        (acc, s) => {
          acc[s.status.toLowerCase()] = s._count.status;
          return acc;
        },
        {} as Record<string, number>
      ),
      integrity: { teachers_with_issues: teachersWithIssues },
      records: {
        users: totalUsers,
        employees: totalEmployees,
        courses: totalCourses,
        editions: totalEditions,
        teachers: totalTeachers,
        clients: totalClients,
        tickets: totalTickets,
        tickets_open: openTickets,
      },
      admin_logins: lastAdminLogins,
    };

    return NextResponse.json({ server: serverData, app: appData });
  } catch (error: any) {
    console.error("[SERVER_MONITOR] DB error:", error);
    return NextResponse.json({
      server: serverData,
      app: { _error: error.message },
    });
  }
}
