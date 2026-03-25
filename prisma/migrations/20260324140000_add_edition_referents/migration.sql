-- CreateTable
CREATE TABLE "EditionReferent" (
    "id" TEXT NOT NULL,
    "courseEditionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "EditionReferent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditionReferent_courseEditionId_idx" ON "EditionReferent"("courseEditionId");

-- CreateIndex
CREATE INDEX "EditionReferent_userId_idx" ON "EditionReferent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EditionReferent_courseEditionId_userId_key" ON "EditionReferent"("courseEditionId", "userId");

-- AddForeignKey
ALTER TABLE "EditionReferent" ADD CONSTRAINT "EditionReferent_courseEditionId_fkey" FOREIGN KEY ("courseEditionId") REFERENCES "CourseEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionReferent" ADD CONSTRAINT "EditionReferent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate permissions: replace "view" with "view-all" in edition-related areas for existing roles
-- This ensures retrocompatibility: users who had "view" now get "view-all" (same access as before)
UPDATE "AdminRole"
SET "permissions" = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        "permissions"::jsonb,
        '{edizioni}',
        (
          SELECT COALESCE(
            jsonb_agg(
              CASE WHEN value::text = '"view"' THEN '"view-all"'::jsonb ELSE value END
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements("permissions"::jsonb -> 'edizioni')
        ),
        true
      ),
      '{presenze}',
      (
        SELECT COALESCE(
          jsonb_agg(
            CASE WHEN value::text = '"view"' THEN '"view-all"'::jsonb ELSE value END
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements("permissions"::jsonb -> 'presenze')
      ),
      true
    ),
    '{attestati}',
    (
      SELECT COALESCE(
        jsonb_agg(
          CASE WHEN value::text = '"view"' THEN '"view-all"'::jsonb ELSE value END
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements("permissions"::jsonb -> 'attestati')
    ),
    true
  ),
  '{materiali}',
  (
    SELECT COALESCE(
      jsonb_agg(
        CASE WHEN value::text = '"view"' THEN '"view-all"'::jsonb ELSE value END
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("permissions"::jsonb -> 'materiali')
  ),
  true
)
WHERE "permissions"::jsonb -> 'edizioni' IS NOT NULL;

-- Update Segreteria template: change view-all to view-own for scoped access
UPDATE "AdminRole"
SET "permissions" = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        "permissions"::jsonb,
        '{edizioni}',
        (SELECT jsonb_agg(CASE WHEN value::text = '"view-all"' THEN '"view-own"'::jsonb ELSE value END) FROM jsonb_array_elements("permissions"::jsonb -> 'edizioni')),
        true
      ),
      '{presenze}',
      (SELECT jsonb_agg(CASE WHEN value::text = '"view-all"' THEN '"view-own"'::jsonb ELSE value END) FROM jsonb_array_elements("permissions"::jsonb -> 'presenze')),
      true
    ),
    '{attestati}',
    (SELECT jsonb_agg(CASE WHEN value::text = '"view-all"' THEN '"view-own"'::jsonb ELSE value END) FROM jsonb_array_elements("permissions"::jsonb -> 'attestati')),
    true
  ),
  '{materiali}',
  (SELECT jsonb_agg(CASE WHEN value::text = '"view-all"' THEN '"view-own"'::jsonb ELSE value END) FROM jsonb_array_elements("permissions"::jsonb -> 'materiali')),
  true
)
WHERE "id" = 'role_segreteria';
