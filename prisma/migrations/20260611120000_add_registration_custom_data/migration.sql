-- AlterTable: anagrafica custom per-edizione sulla registration (nullable, nessun backfill automatico)
ALTER TABLE "CourseRegistration" ADD COLUMN "customData" JSONB;
