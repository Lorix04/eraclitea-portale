-- AlterTable: add codiceFiscale (nullable; required at application layer).
-- Existing rows keep NULL until populated via the admin UI. Postgres unique
-- indexes allow multiple NULLs, so adding @unique here is safe on existing data.
ALTER TABLE "Client" ADD COLUMN "codiceFiscale" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_codiceFiscale_key" ON "Client"("codiceFiscale");
