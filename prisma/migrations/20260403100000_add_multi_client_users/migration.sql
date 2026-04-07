-- CreateEnum
CREATE TYPE "ClientUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "maxUsers" INTEGER;

-- CreateTable
CREATE TABLE "ClientUser" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ClientUserStatus" NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientInvite" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientActivityLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_clientId_userId_key" ON "ClientUser"("clientId", "userId");
CREATE INDEX "ClientUser_clientId_idx" ON "ClientUser"("clientId");
CREATE INDEX "ClientUser_userId_idx" ON "ClientUser"("userId");
CREATE UNIQUE INDEX "ClientInvite_token_key" ON "ClientInvite"("token");
CREATE UNIQUE INDEX "ClientInvite_clientId_email_key" ON "ClientInvite"("clientId", "email");
CREATE INDEX "ClientInvite_token_idx" ON "ClientInvite"("token");
CREATE INDEX "ClientInvite_email_idx" ON "ClientInvite"("email");
CREATE INDEX "ClientActivityLog_clientId_createdAt_idx" ON "ClientActivityLog"("clientId", "createdAt");
CREATE INDEX "ClientActivityLog_userId_idx" ON "ClientActivityLog"("userId");

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientInvite" ADD CONSTRAINT "ClientInvite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientActivityLog" ADD CONSTRAINT "ClientActivityLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientActivityLog" ADD CONSTRAINT "ClientActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: create ClientUser records for existing client users
INSERT INTO "ClientUser" ("id", "clientId", "userId", "isOwner", "invitedAt", "status")
SELECT gen_random_uuid(), "clientId", "id", true, NOW(), 'ACTIVE'
FROM "User"
WHERE "clientId" IS NOT NULL AND "role" = 'CLIENT';
