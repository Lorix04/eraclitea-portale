import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyEmailType } from "@/lib/email-retry-policy";
import { emailQueue } from "@/lib/email-queue";

const bodySchema = z.object({
  emailIds: z.array(z.string().min(1)).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const payload = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const emailIds = payload.data.emailIds ?? [];
  const logs = await prisma.emailLog.findMany({
    where: {
      status: "FAILED",
      ...(emailIds.length > 0 ? { id: { in: emailIds } } : {}),
    },
    orderBy: { sentAt: "asc" },
  });

  let skipped = 0;
  const queueJobs: Array<{ logId: string; mode: "manual" }> = [];
  const sensitiveItems: Array<{
    id: string;
    recipientEmail: string;
    emailType: string;
  }> = [];

  for (const log of logs) {
    const classification = classifyEmailType(log.emailType);
    const isSensitive = log.sensitive || classification.sensitive;

    if (!log.retryable) {
      skipped += 1;
      continue;
    }

    if (isSensitive) {
      sensitiveItems.push({
        id: log.id,
        recipientEmail: log.recipientEmail,
        emailType: classification.normalizedType,
      });
      continue;
    }

    queueJobs.push({
      logId: log.id,
      mode: "manual",
    });
  }

  await emailQueue.addMany(queueJobs);

  const queued = queueJobs.length;
  const sensitive = sensitiveItems.length;
  const estimatedSeconds = queued * 3;

  return NextResponse.json({
    queued,
    sensitive,
    skipped,
    estimatedTime: `${estimatedSeconds}s`,
    sensitiveItems,
  });
}
