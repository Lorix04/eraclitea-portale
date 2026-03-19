-- CreateTable
CREATE TABLE "EditionMaterial" (
    "id" TEXT NOT NULL,
    "courseEditionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedByRole" TEXT NOT NULL,
    "uploadedByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditionMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditionMaterial_courseEditionId_idx" ON "EditionMaterial"("courseEditionId");
CREATE INDEX "EditionMaterial_courseEditionId_category_idx" ON "EditionMaterial"("courseEditionId", "category");

-- AddForeignKey
ALTER TABLE "EditionMaterial" ADD CONSTRAINT "EditionMaterial_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
