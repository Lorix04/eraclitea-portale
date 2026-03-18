-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('INACTIVE', 'PENDING', 'ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- AlterTable: Add new columns to Teacher
ALTER TABLE "Teacher" ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "birthPlace" TEXT,
ADD COLUMN "birthProvince" TEXT,
ADD COLUMN "gender" TEXT,
ADD COLUMN "fiscalCode" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "fax" TEXT,
ADD COLUMN "mobile" TEXT,
ADD COLUMN "emailSecondary" TEXT,
ADD COLUMN "pec" TEXT,
ADD COLUMN "vatNumber" TEXT,
ADD COLUMN "iban" TEXT,
ADD COLUMN "vatExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publicEmployee" BOOLEAN,
ADD COLUMN "educationLevel" TEXT,
ADD COLUMN "profession" TEXT,
ADD COLUMN "employerName" TEXT,
ADD COLUMN "sdiCode" TEXT,
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "idDocumentPath" TEXT,
ADD COLUMN "idDocumentName" TEXT,
ADD COLUMN "status" "TeacherStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN "userId" TEXT,
ADD COLUMN "inviteToken" TEXT,
ADD COLUMN "inviteTokenExpiry" TIMESTAMP(3),
ADD COLUMN "inviteSentAt" TIMESTAMP(3);

-- Populate status for existing teachers
UPDATE "Teacher" SET "status" = 'ACTIVE' WHERE "active" = true;
UPDATE "Teacher" SET "status" = 'INACTIVE' WHERE "active" = false;

-- CreateTable
CREATE TABLE "TeacherSignedDocument" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "declaration1" BOOLEAN NOT NULL DEFAULT false,
    "declaration2" BOOLEAN NOT NULL DEFAULT false,
    "declaration3" BOOLEAN NOT NULL DEFAULT false,
    "declaration4" BOOLEAN NOT NULL DEFAULT false,
    "declaration5" BOOLEAN NOT NULL DEFAULT false,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "signatureImage" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedFromIp" TEXT,
    "pdfPath" TEXT,
    "pdfOriginalName" TEXT,
    "declarationPlace" TEXT,
    "declarationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSignedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherSignedDocument_teacherId_idx" ON "TeacherSignedDocument"("teacherId");
CREATE INDEX "TeacherSignedDocument_documentType_idx" ON "TeacherSignedDocument"("documentType");

-- CreateIndex: Unique constraints on Teacher
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");
CREATE UNIQUE INDEX "Teacher_inviteToken_key" ON "Teacher"("inviteToken");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSignedDocument" ADD CONSTRAINT "TeacherSignedDocument_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
