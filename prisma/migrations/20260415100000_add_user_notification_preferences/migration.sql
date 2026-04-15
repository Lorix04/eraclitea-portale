-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_notificationType_key" ON "UserNotificationPreference"("userId", "notificationType");

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
