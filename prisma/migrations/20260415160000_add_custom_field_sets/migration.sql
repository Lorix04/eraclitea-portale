-- CreateTable
CREATE TABLE "CustomFieldSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldSet_clientId_idx" ON "CustomFieldSet"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldSet_clientId_name_key" ON "CustomFieldSet"("clientId", "name");

-- AddForeignKey
ALTER TABLE "CustomFieldSet" ADD CONSTRAINT "CustomFieldSet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable ClientCustomField: add customFieldSetId
ALTER TABLE "ClientCustomField" ADD COLUMN "customFieldSetId" TEXT;

-- CreateIndex
CREATE INDEX "ClientCustomField_customFieldSetId_idx" ON "ClientCustomField"("customFieldSetId");

-- AddForeignKey
ALTER TABLE "ClientCustomField" ADD CONSTRAINT "ClientCustomField_customFieldSetId_fkey" FOREIGN KEY ("customFieldSetId") REFERENCES "CustomFieldSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable CourseEdition: add customFieldSetId
ALTER TABLE "CourseEdition" ADD COLUMN "customFieldSetId" TEXT;

-- AddForeignKey
ALTER TABLE "CourseEdition" ADD CONSTRAINT "CourseEdition_customFieldSetId_fkey" FOREIGN KEY ("customFieldSetId") REFERENCES "CustomFieldSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Migration: Create default sets for existing clients with custom fields
INSERT INTO "CustomFieldSet" ("id", "clientId", "name", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c.id, 'Template predefinito', true, true, NOW(), NOW()
FROM "Client" c
WHERE c."hasCustomFields" = true
AND EXISTS (SELECT 1 FROM "ClientCustomField" WHERE "clientId" = c.id AND "isActive" = true);

-- Link existing custom fields to their client's default set
UPDATE "ClientCustomField" cf
SET "customFieldSetId" = cfs.id
FROM "CustomFieldSet" cfs
WHERE cf."clientId" = cfs."clientId" AND cfs."isDefault" = true
AND cf."customFieldSetId" IS NULL;

-- Link existing editions to their client's default set
UPDATE "CourseEdition" ce
SET "customFieldSetId" = cfs.id
FROM "CustomFieldSet" cfs
WHERE ce."clientId" = cfs."clientId"
AND cfs."isDefault" = true
AND ce."customFieldSetId" IS NULL;
