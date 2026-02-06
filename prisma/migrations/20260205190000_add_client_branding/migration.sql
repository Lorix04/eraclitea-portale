-- Add branding fields to Client
ALTER TABLE "Client" ADD COLUMN "primaryColor" TEXT;
ALTER TABLE "Client" ADD COLUMN "secondaryColor" TEXT;
ALTER TABLE "Client" ADD COLUMN "sidebarBgColor" TEXT;
ALTER TABLE "Client" ADD COLUMN "sidebarTextColor" TEXT;
ALTER TABLE "Client" ADD COLUMN "logoPath" TEXT;
ALTER TABLE "Client" ADD COLUMN "logoLightPath" TEXT;
ALTER TABLE "Client" ADD COLUMN "logoFileName" TEXT;
ALTER TABLE "Client" ADD COLUMN "logoLightFileName" TEXT;
