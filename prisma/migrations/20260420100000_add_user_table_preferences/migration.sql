-- CreateTable: per-user, per-table column customization (visibility + order)
CREATE TABLE "UserTablePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableKey" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTablePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTablePreference_userId_tableKey_key" ON "UserTablePreference"("userId", "tableKey");
CREATE INDEX "UserTablePreference_userId_idx" ON "UserTablePreference"("userId");

-- AddForeignKey
ALTER TABLE "UserTablePreference" ADD CONSTRAINT "UserTablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
