import { prisma } from "@/lib/prisma";
import { retryNonSensitiveEmailLog } from "@/lib/email-retry-service";

export type EmailJob = {
  logId: string;
  mode: "manual" | "auto";
};

export type QueueStatus = {
  active: boolean;
  pending: number;
  sent: number;
  failed: number;
  total: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class EmailQueue {
  private queue: EmailJob[] = [];

  private processing = false;

  private aborted = false;

  private sent = 0;

  private failed = 0;

  private total = 0;

  readonly intervalMs = 3000;

  private resetCountersIfIdle() {
    if (!this.processing && this.queue.length === 0) {
      this.sent = 0;
      this.failed = 0;
      this.total = 0;
    }
  }

  async add(job: EmailJob): Promise<void> {
    await this.addMany([job]);
  }

  async addMany(jobs: EmailJob[]): Promise<void> {
    if (jobs.length === 0) return;
    this.resetCountersIfIdle();
    this.queue.push(...jobs);
    this.total += jobs.length;

    const ids = jobs.map((job) => job.logId);
    await prisma.emailLog.updateMany({
      where: {
        id: { in: ids },
        status: "FAILED",
        retryable: true,
      },
      data: {
        retryStatus: "pending",
      },
    });

    void this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    this.aborted = false;

    while (this.queue.length > 0 && !this.aborted) {
      const job = this.queue.shift();
      if (!job) break;

      const result = await retryNonSensitiveEmailLog(job.logId, {
        autoMode: job.mode === "auto",
      });
      if (result.success) {
        this.sent += 1;
      } else {
        this.failed += 1;
      }

      if (this.queue.length > 0 && !this.aborted) {
        await sleep(this.intervalMs);
      }
    }

    this.processing = false;
  }

  getStatus(): QueueStatus {
    return {
      active: this.processing,
      pending: this.queue.length,
      sent: this.sent,
      failed: this.failed,
      total: this.total,
    };
  }

  abort(): void {
    this.aborted = true;
    const pendingIds = this.queue.map((job) => job.logId);
    this.queue = [];
    if (pendingIds.length > 0) {
      void prisma.emailLog.updateMany({
        where: { id: { in: pendingIds } },
        data: {
          retryStatus: null,
        },
      });
    }
  }
}

const globalForEmailQueue = globalThis as unknown as {
  emailRetryQueue?: EmailQueue;
};

export const emailQueue =
  globalForEmailQueue.emailRetryQueue ?? new EmailQueue();

if (process.env.NODE_ENV !== "production") {
  globalForEmailQueue.emailRetryQueue = emailQueue;
}
