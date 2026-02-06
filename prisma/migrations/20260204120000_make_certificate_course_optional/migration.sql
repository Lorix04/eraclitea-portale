-- Alter courseId to be optional and set FK to ON DELETE SET NULL
ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_courseId_fkey";
ALTER TABLE "Certificate" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
