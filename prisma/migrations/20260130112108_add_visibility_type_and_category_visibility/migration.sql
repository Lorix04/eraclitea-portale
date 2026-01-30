-- CreateEnum
CREATE TYPE "VisibilityType" AS ENUM ('ALL', 'SELECTED_CLIENTS', 'BY_CATEGORY');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "visibilityType" "VisibilityType" NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "CourseVisibilityCategory" (
    "courseId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseVisibilityCategory_pkey" PRIMARY KEY ("courseId","categoryId")
);

-- AddForeignKey
ALTER TABLE "CourseVisibilityCategory" ADD CONSTRAINT "CourseVisibilityCategory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseVisibilityCategory" ADD CONSTRAINT "CourseVisibilityCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
