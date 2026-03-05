-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "htmlBody" TEXT,
ADD COLUMN     "lastRetryAt" TIMESTAMP(3),
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retryStatus" TEXT,
ADD COLUMN     "retryable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textBody" TEXT;

-- CreateIndex
CREATE INDEX "EmailLog_status_retryable_idx" ON "EmailLog"("status", "retryable");

-- CreateIndex
CREATE INDEX "EmailLog_retryStatus_idx" ON "EmailLog"("retryStatus");
