import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const check = await requirePermission("integrazioni-ai", "view");
  if (check instanceof NextResponse) return check;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const statusFilter = url.searchParams.get("status");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (statusFilter === "success" || statusFilter === "error") {
    where.status = statusFilter;
  }

  const [logs, total, successCount, errorCount, avgDuration] =
    await prisma.$transaction([
      prisma.aiCallLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.aiCallLog.count({ where }),
      prisma.aiCallLog.count({ where: { status: "success" } }),
      prisma.aiCallLog.count({ where: { status: "error" } }),
      prisma.aiCallLog.aggregate({
        _avg: { durationMs: true },
        where: { status: "success" },
      }),
    ]);

  // Resolve user and teacher names
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const teacherIds = [...new Set(logs.map((l) => l.teacherId).filter(Boolean))] as string[];

  const [users, teachers] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [],
    teacherIds.length
      ? prisma.teacher.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.email]));
  const teacherMap = new Map(
    teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`])
  );

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      model: l.model,
      status: l.status,
      errorMessage: l.errorMessage,
      inputTokens: l.inputTokens,
      outputTokens: l.outputTokens,
      durationMs: l.durationMs,
      userId: l.userId,
      userName: l.userId ? userMap.get(l.userId) || null : null,
      teacherId: l.teacherId,
      teacherName: l.teacherId ? teacherMap.get(l.teacherId) || null : null,
      createdAt: l.createdAt,
    })),
    total,
    stats: {
      totalCalls: successCount + errorCount,
      successCount,
      errorCount,
      avgDurationMs: Math.round(avgDuration._avg.durationMs || 0),
    },
  });
}
