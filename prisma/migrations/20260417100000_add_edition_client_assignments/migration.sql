-- CreateTable: client admin assignment to a specific edition (separate from EditionReferent)
CREATE TABLE "EditionClientAssignment" (
    "id" TEXT NOT NULL,
    "courseEditionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "EditionClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EditionClientAssignment_courseEditionId_userId_key" ON "EditionClientAssignment"("courseEditionId", "userId");
CREATE INDEX "EditionClientAssignment_courseEditionId_idx" ON "EditionClientAssignment"("courseEditionId");
CREATE INDEX "EditionClientAssignment_userId_idx" ON "EditionClientAssignment"("userId");

-- AddForeignKey
ALTER TABLE "EditionClientAssignment" ADD CONSTRAINT "EditionClientAssignment_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditionClientAssignment" ADD CONSTRAINT "EditionClientAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
