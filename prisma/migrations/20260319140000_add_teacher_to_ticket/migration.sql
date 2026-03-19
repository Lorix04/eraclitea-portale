-- AlterTable: Make clientId nullable and add teacherId to Ticket
ALTER TABLE "Ticket" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "Ticket" ADD COLUMN "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_teacherId_idx" ON "Ticket"("teacherId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
