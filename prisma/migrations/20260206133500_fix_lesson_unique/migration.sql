-- Drop legacy unique constraint on courseId/date/startTime
DROP INDEX IF EXISTS "Lesson_courseId_date_startTime_key";

-- Ensure uniqueness per edition instead of per course template
CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_courseEditionId_date_startTime_key"
ON "Lesson"("courseEditionId", "date", "startTime");
