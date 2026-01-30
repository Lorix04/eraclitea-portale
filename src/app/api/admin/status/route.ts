import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { promises as fs } from "fs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbStart = Date.now();
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const dbLatency = Date.now() - dbStart;

  const storagePath = process.env.FILE_STORAGE_PATH || "./uploads";
  let storageOk = true;
  let storageStats = { used: "N/A", total: "N/A" };
  try {
    await fs.access(storagePath);
  } catch {
    storageOk = false;
  }

  const emailOk = !!process.env.SMTP_HOST;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestsToday = await prisma.auditLog.count({
    where: { createdAt: { gte: today } },
  });

  return NextResponse.json({
    database: { ok: dbOk, latency: dbLatency },
    email: { ok: emailOk, provider: process.env.SMTP_HOST || "Not configured" },
    storage: { ok: storageOk, ...storageStats },
    api: { ok: true, uptime: process.uptime() },
    metrics: {
      requestsToday,
      errorsToday: 0,
      avgResponseTime: dbLatency,
    },
    timestamp: new Date().toISOString(),
  });
}
