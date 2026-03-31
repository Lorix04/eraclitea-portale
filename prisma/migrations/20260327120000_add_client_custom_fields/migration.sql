-- AlterTable: add hasCustomFields to Client
ALTER TABLE "Client" ADD COLUMN "hasCustomFields" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add customData to Employee
ALTER TABLE "Employee" ADD COLUMN "customData" JSONB;

-- CreateTable
CREATE TABLE "ClientCustomField" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "options" TEXT,
    "defaultValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "columnHeader" TEXT,
    "columnWidth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientCustomField_clientId_name_key" ON "ClientCustomField"("clientId", "name");

-- CreateIndex
CREATE INDEX "ClientCustomField_clientId_idx" ON "ClientCustomField"("clientId");

-- CreateIndex
CREATE INDEX "ClientCustomField_clientId_sortOrder_idx" ON "ClientCustomField"("clientId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ClientCustomField" ADD CONSTRAINT "ClientCustomField_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
