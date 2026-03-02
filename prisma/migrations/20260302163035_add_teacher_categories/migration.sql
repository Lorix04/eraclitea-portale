-- CreateTable
CREATE TABLE "_CategoryToTeacher" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToTeacher_AB_unique" ON "_CategoryToTeacher"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToTeacher_B_index" ON "_CategoryToTeacher"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToTeacher" ADD CONSTRAINT "_CategoryToTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToTeacher" ADD CONSTRAINT "_CategoryToTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
