-- AlterEnum: Add material notification types
ALTER TYPE "NotificationType" ADD VALUE 'MATERIAL_UPLOADED';
ALTER TYPE "NotificationType" ADD VALUE 'MATERIAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'MATERIAL_REJECTED';
