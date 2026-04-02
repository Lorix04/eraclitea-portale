-- CreateEnum
CREATE TYPE "CvDpr445Status" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CV_DPR445_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CV_DPR445_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'CV_DPR445_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CV_DPR445_REJECTED';

-- CreateTable
CREATE TABLE "TeacherCvDpr445" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "CvDpr445Status" NOT NULL DEFAULT 'NOT_REQUESTED',
    "requestedAt" TIMESTAMP(3),
    "requestedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "deadline" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "prerequisitoTitoloStudio" TEXT,
    "criterioSelezionato" INTEGER,
    "criterioSpecifica" TEXT,
    "areeTematiche" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentazioneProbante" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataConseguimentoQualifica" TIMESTAMP(3),
    "dataAggiornamentoQualifica" TIMESTAMP(3),
    "modalitaAggiornamento" TEXT,
    "responsabileProgettoFormativo" BOOLEAN NOT NULL DEFAULT false,
    "docRespProgettoFormativo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "abilitazioneAttrezzature" BOOLEAN NOT NULL DEFAULT false,
    "attrezzatureTeoriche" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attrezzaturePratiche" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "abilitazioneAmbientiConfinati" BOOLEAN NOT NULL DEFAULT false,
    "ambientiConfinatiTipo" TEXT,
    "abilitazionePonteggi" BOOLEAN NOT NULL DEFAULT false,
    "abilitazioneFuni" BOOLEAN NOT NULL DEFAULT false,
    "abilitazioneSegnaleticaStradale" BOOLEAN NOT NULL DEFAULT false,
    "abilitazioneAntincendio" BOOLEAN NOT NULL DEFAULT false,
    "antincendioIpotesi" TEXT,
    "abilitazioneDiisocianati" BOOLEAN NOT NULL DEFAULT false,
    "corsiDiisocianati" JSONB,
    "abilitazioneHACCP" BOOLEAN NOT NULL DEFAULT false,
    "abilitazionePrimoSoccorso" BOOLEAN NOT NULL DEFAULT false,
    "primoSoccorsoTipo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "abilitazionePESPAVPEI" BOOLEAN NOT NULL DEFAULT false,
    "consensoPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherCvDpr445_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCvDpr445_teacherId_key" ON "TeacherCvDpr445"("teacherId");
CREATE INDEX "TeacherCvDpr445_teacherId_idx" ON "TeacherCvDpr445"("teacherId");
CREATE INDEX "TeacherCvDpr445_status_idx" ON "TeacherCvDpr445"("status");

-- AddForeignKey
ALTER TABLE "TeacherCvDpr445" ADD CONSTRAINT "TeacherCvDpr445_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
