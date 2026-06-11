-- CreateEnum: fascia oraria opzionale dell'edizione (AM = Mattina, PM = Pomeriggio)
CREATE TYPE "TimeSlot" AS ENUM ('AM', 'PM');

-- AlterTable: campo opzionale, nessun backfill (le edizioni esistenti restano NULL)
ALTER TABLE "CourseEdition" ADD COLUMN "timeSlot" "TimeSlot";
