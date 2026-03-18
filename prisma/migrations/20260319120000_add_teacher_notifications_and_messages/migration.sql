-- AlterEnum: Add teacher notification types
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_MESSAGE_RECEIVED';

-- AlterTable: Add readAt to Notification
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateTable: TeacherMessage
CREATE TABLE "TeacherMessage" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT,
    "readByTeacher" BOOLEAN NOT NULL DEFAULT false,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherMessage_teacherId_idx" ON "TeacherMessage"("teacherId");
CREATE INDEX "TeacherMessage_threadId_idx" ON "TeacherMessage"("threadId");
CREATE INDEX "TeacherMessage_teacherId_readByTeacher_idx" ON "TeacherMessage"("teacherId", "readByTeacher");

-- AddForeignKey
ALTER TABLE "TeacherMessage" ADD CONSTRAINT "TeacherMessage_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
