-- AlterTable
ALTER TABLE "EditionMaterial" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "EditionMaterial" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "EditionMaterial" ADD COLUMN "rejectionReason" TEXT;