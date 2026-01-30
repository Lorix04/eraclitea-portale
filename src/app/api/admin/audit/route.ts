import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const limit = Number(searchParams.get("limit") || 50);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  };

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ data: logs, total, page, limit });
}
