/*
  Warnings:

  - You are about to drop the column `courseId` on the `Certificate` table. All the data in the column will be lost.
  - You are about to drop the column `dateEnd` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `dateStart` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `deadlineRegistry` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `CourseRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Notification` table. All the data in the column will be lost.
  - Made the column `courseEditionId` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `courseEditionId` on table `CourseRegistration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `courseEditionId` on table `Lesson` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CourseRegistration" DROP CONSTRAINT "CourseRegistration_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_courseId_fkey";

-- DropIndex
DROP INDEX "CourseRegistration_courseId_status_idx";

-- DropIndex
DROP INDEX "Lesson_courseId_idx";

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "courseEditionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "courseId";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "dateEnd",
DROP COLUMN "dateStart",
DROP COLUMN "deadlineRegistry",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "CourseRegistration" DROP COLUMN "courseId",
ALTER COLUMN "courseEditionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "courseId",
ALTER COLUMN "courseEditionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "courseId";
