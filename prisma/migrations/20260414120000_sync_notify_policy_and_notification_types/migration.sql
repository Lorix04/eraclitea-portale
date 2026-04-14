-- CreateEnum NotifyPolicy
CREATE TYPE "NotifyPolicy" AS ENUM ('REFERENT_ONLY', 'REFERENT_PLUS', 'ALL');

-- AlterTable CourseEdition: add notify policy fields
ALTER TABLE "CourseEdition" ADD COLUMN "notifyPolicy" "NotifyPolicy" NOT NULL DEFAULT 'ALL';
ALTER TABLE "CourseEdition" ADD COLUMN "notifyExtraUserIds" TEXT[] DEFAULT '{}';

-- AlterTable Client: add default notify policy
ALTER TABLE "Client" ADD COLUMN "defaultNotifyPolicy" "NotifyPolicy" NOT NULL DEFAULT 'REFERENT_ONLY';

-- AlterEnum NotificationType: add new values (batch 1 - client notifications)
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRY_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'WEEKLY_SUMMARY';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CLOSED';

-- AlterEnum NotificationType: add new values (batch 2 - extended notifications)
ALTER TYPE "NotificationType" ADD VALUE 'EDITION_INFO_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_TODAY';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_STARTING_TOMORROW';
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRY_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'EMPLOYEE_REMOVED_BY_ADMIN';
ALTER TYPE "NotificationType" ADD VALUE 'EMPLOYEE_ADDED_BY_ADMIN';
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_RENEWED';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_BELOW_MINIMUM';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_SUMMARY';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_LOGIN_UNKNOWN_DEVICE';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_UNLOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REOPENED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_INACTIVE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_LIMIT_ALMOST_REACHED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITE_EXPIRED_NOTIFY';
