/*
  Warnings:

  - A unique constraint covering the columns `[courseEditionId,employeeId]` on the table `CourseRegistration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CourseRegistration_courseId_employeeId_key";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "courseEditionId" TEXT;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "courseEditionId" TEXT;

-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "courseEditionId" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "courseEditionId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "courseEditionId" TEXT;

-- CreateTable
CREATE TABLE "CourseEdition" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "deadlineRegistry" TIMESTAMP(3),
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEdition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseEdition_courseId_idx" ON "CourseEdition"("courseId");

-- CreateIndex
CREATE INDEX "CourseEdition_clientId_idx" ON "CourseEdition"("clientId");

-- CreateIndex
CREATE INDEX "CourseEdition_status_idx" ON "CourseEdition"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEdition_courseId_clientId_editionNumber_key" ON "CourseEdition"("courseId", "clientId", "editionNumber");

-- CreateIndex
CREATE INDEX "Attendance_courseEditionId_idx" ON "Attendance"("courseEditionId");

-- CreateIndex
CREATE INDEX "Certificate_courseEditionId_idx" ON "Certificate"("courseEditionId");

-- CreateIndex
CREATE INDEX "CourseRegistration_courseEditionId_idx" ON "CourseRegistration"("courseEditionId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRegistration_courseEditionId_employeeId_key" ON "CourseRegistration"("courseEditionId", "employeeId");

-- CreateIndex
CREATE INDEX "Lesson_courseEditionId_idx" ON "Lesson"("courseEditionId");

-- AddForeignKey
ALTER TABLE "CourseEdition" ADD CONSTRAINT "CourseEdition_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEdition" ADD CONSTRAINT "CourseEdition_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRegistration" ADD CONSTRAINT "CourseRegistration_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
