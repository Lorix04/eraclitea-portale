-- DropIndex: old unique constraint on (clientId, name)
DROP INDEX IF EXISTS "ClientCustomField_clientId_name_key";

-- AlterColumn: make customFieldSetId required
-- First delete any orphan rows (safety net)
DELETE FROM "ClientCustomField" WHERE "customFieldSetId" IS NULL;
ALTER TABLE "ClientCustomField" ALTER COLUMN "customFieldSetId" SET NOT NULL;

-- CreateIndex: new unique constraint on (customFieldSetId, name)
CREATE UNIQUE INDEX "ClientCustomField_customFieldSetId_name_key" ON "ClientCustomField"("customFieldSetId", "name");
