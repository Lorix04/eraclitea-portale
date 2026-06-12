-- CreateTable: storico modifiche anagrafiche post-deadline
CREATE TABLE "PostDeadlineEdit" (
    "id" TEXT NOT NULL,
    "courseEditionId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userRole" TEXT,
    "source" TEXT,

    CONSTRAINT "PostDeadlineEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostDeadlineEdit_courseEditionId_idx" ON "PostDeadlineEdit"("courseEditionId");

-- AddForeignKey
ALTER TABLE "PostDeadlineEdit" ADD CONSTRAINT "PostDeadlineEdit_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
