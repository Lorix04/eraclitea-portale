-- AlterTable: per-client toggle to persist custom field values into Employee.customData.
-- Default false: import/save flows ignore customData for existing clients (no migration of data needed).
ALTER TABLE "Client" ADD COLUMN "saveEmployeeCustomData" BOOLEAN NOT NULL DEFAULT false;
