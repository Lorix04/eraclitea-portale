-- AlterEnum: nuovo tipo notifica per modifiche anagrafiche post-deadline
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_POST_DEADLINE_EDIT';

-- AlterTable: timestamp di throttle della notifica per-edizione (max 1/60min)
ALTER TABLE "CourseEdition" ADD COLUMN "lastPostDeadlineNotifyAt" TIMESTAMP(3);
