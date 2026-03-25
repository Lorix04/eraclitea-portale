-- Teacher CV Structured Models

CREATE TABLE "TeacherWorkExperience" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "city" TEXT,
    "sector" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherWorkExperience_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherWorkExperience_teacherId_idx" ON "TeacherWorkExperience"("teacherId");
CREATE INDEX "TeacherWorkExperience_teacherId_sortOrder_idx" ON "TeacherWorkExperience"("teacherId", "sortOrder");
ALTER TABLE "TeacherWorkExperience" ADD CONSTRAINT "TeacherWorkExperience_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherEducation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "city" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherEducation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherEducation_teacherId_idx" ON "TeacherEducation"("teacherId");
ALTER TABLE "TeacherEducation" ADD CONSTRAINT "TeacherEducation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherLanguage" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "isNative" BOOLEAN NOT NULL DEFAULT false,
    "listening" TEXT,
    "reading" TEXT,
    "speaking" TEXT,
    "writing" TEXT,
    "certificate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherLanguage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherLanguage_teacherId_idx" ON "TeacherLanguage"("teacherId");
ALTER TABLE "TeacherLanguage" ADD CONSTRAINT "TeacherLanguage_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherCertification" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherCertification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherCertification_teacherId_idx" ON "TeacherCertification"("teacherId");
ALTER TABLE "TeacherCertification" ADD CONSTRAINT "TeacherCertification_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherSkill" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "level" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherSkill_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherSkill_teacherId_idx" ON "TeacherSkill"("teacherId");
ALTER TABLE "TeacherSkill" ADD CONSTRAINT "TeacherSkill_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherTrainingCourse" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "date" TIMESTAMP(3),
    "durationHours" DOUBLE PRECISION,
    "topic" TEXT,
    "certificate" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherTrainingCourse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherTrainingCourse_teacherId_idx" ON "TeacherTrainingCourse"("teacherId");
ALTER TABLE "TeacherTrainingCourse" ADD CONSTRAINT "TeacherTrainingCourse_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherTeachingExperience" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "topic" TEXT,
    "organization" TEXT,
    "targetAudience" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "location" TEXT,
    "description" TEXT,
    "isFromPortal" BOOLEAN NOT NULL DEFAULT false,
    "lessonId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherTeachingExperience_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherTeachingExperience_teacherId_idx" ON "TeacherTeachingExperience"("teacherId");
ALTER TABLE "TeacherTeachingExperience" ADD CONSTRAINT "TeacherTeachingExperience_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherPublication" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "date" TIMESTAMP(3),
    "url" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherPublication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherPublication_teacherId_idx" ON "TeacherPublication"("teacherId");
ALTER TABLE "TeacherPublication" ADD CONSTRAINT "TeacherPublication_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
