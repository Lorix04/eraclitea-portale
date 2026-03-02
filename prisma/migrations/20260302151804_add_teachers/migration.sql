-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialization" TEXT,
    "bio" TEXT,
    "cvPath" TEXT,
    "cvOriginalName" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherUnavailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAssignment_lessonId_idx" ON "TeacherAssignment"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_lessonId_key" ON "TeacherAssignment"("teacherId", "lessonId");

-- CreateIndex
CREATE INDEX "TeacherUnavailability_teacherId_date_idx" ON "TeacherUnavailability"("teacherId", "date");

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherUnavailability" ADD CONSTRAINT "TeacherUnavailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
