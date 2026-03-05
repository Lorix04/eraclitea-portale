import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/email-queue";

const MAX_AUTO_RETRIES = 3;
const RETRY_COOLDOWN_MINUTES = 15;
const DEFAULT_BATCH_LIMIT = 100;

function getThresholdDate() {
  return new Date(Date.now() - RETRY_COOLDOWN_MINUTES * 60 * 1000);
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") || DEFAULT_BATCH_LIMIT);
  const limit = Number.isNaN(limitRaw)
    ? DEFAULT_BATCH_LIMIT
    : Math.max(1, Math.min(500, limitRaw));
  const threshold = getThresholdDate();

  const [eligibleLogs, abandonedResult] = await prisma.$transaction([
    prisma.emailLog.findMany({
      where: {
        status: "FAILED",
        retryable: true,
        sensitive: false,
        retryCount: { lt: MAX_AUTO_RETRIES },
        OR: [
          { lastRetryAt: null },
          { lastRetryAt: { lte: threshold } },
        ],
        NOT: {
          retryStatus: {
            in: ["pending", "retrying"],
          },
        },
      },
      orderBy: { sentAt: "asc" },
      take: limit,
      select: { id: true },
    }),
    prisma.emailLog.updateMany({
      where: {
        status: "FAILED",
        retryable: true,
        sensitive: false,
        retryCount: { gte: MAX_AUTO_RETRIES },
        retryStatus: { not: "abandoned" },
      },
      data: {
        retryStatus: "abandoned",
      },
    }),
  ]);

  await emailQueue.addMany(
    eligibleLogs.map((log) => ({
      logId: log.id,
      mode: "auto" as const,
    }))
  );

  const remainingEligible = await prisma.emailLog.count({
    where: {
      status: "FAILED",
      retryable: true,
      sensitive: false,
      retryCount: { lt: MAX_AUTO_RETRIES },
      OR: [{ lastRetryAt: null }, { lastRetryAt: { lte: threshold } }],
    },
  });

  return NextResponse.json({
    success: true,
    queued: eligibleLogs.length,
    autoAbandoned: abandonedResult.count,
    remainingEligible,
  });
}
