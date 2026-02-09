import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

type RegistrationGroup = {
  courseId: string;
  clientId: string;
  registrationIds: string[];
};

type LegacyLesson = {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  durationHours: number;
  title: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const log = (message: string) => {
  console.log(`[migrate-to-editions] ${message}`);
};

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS "exists"
  `);
  return rows[0]?.exists ?? false;
}

async function indexExists(indexName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ${indexName}
    ) AS "exists"
  `);
  return rows[0]?.exists ?? false;
}

async function getLegacyCourse(courseId: string) {
  const rows = await prisma.$queryRaw<any[]>(
    Prisma.sql`SELECT * FROM "Course" WHERE "id" = ${courseId} LIMIT 1`
  );
  return rows[0] ?? null;
}

async function getOrCreateEdition(
  courseId: string,
  clientId: string,
  legacyCourse: any
) {
  const existing = await prisma.courseEdition.findFirst({
    where: { courseId, clientId },
    orderBy: { editionNumber: "asc" },
  });
  if (existing) return existing;

  const allowedStatuses = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"];
  const status =
    typeof legacyCourse?.status === "string" &&
    allowedStatuses.includes(legacyCourse.status)
      ? legacyCourse.status
      : "DRAFT";

  return prisma.courseEdition.create({
    data: {
      courseId,
      clientId,
      editionNumber: 1,
      startDate: legacyCourse?.dateStart ?? legacyCourse?.startDate ?? null,
      endDate: legacyCourse?.dateEnd ?? legacyCourse?.endDate ?? null,
      deadlineRegistry: legacyCourse?.deadlineRegistry ?? null,
      status,
      notes: legacyCourse?.notes ?? null,
    },
  });
}

async function updateRegistrations(editionId: string, registrationIds: string[]) {
  if (registrationIds.length === 0) return;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "CourseRegistration"
    SET "courseEditionId" = ${editionId}
    WHERE "id" IN (${Prisma.join(registrationIds)})
      AND "courseEditionId" IS NULL
  `);
}

async function updateCertificates(
  editionId: string,
  courseId: string,
  clientId: string,
  hasCertificateCourseId: boolean
) {
  if (!hasCertificateCourseId) return;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Certificate"
    SET "courseEditionId" = ${editionId}
    WHERE "courseId" = ${courseId}
      AND "clientId" = ${clientId}
      AND "courseEditionId" IS NULL
  `);
}

async function assignLessonsToEdition(
  lessonIds: string[],
  editionId: string
) {
  if (lessonIds.length === 0) return;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Lesson"
    SET "courseEditionId" = ${editionId}
    WHERE "id" IN (${Prisma.join(lessonIds)})
      AND "courseEditionId" IS NULL
  `);
}

async function updateAttendancesForClient(
  lessonIds: string[],
  editionId: string,
  clientId: string
) {
  if (lessonIds.length === 0) return;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Attendance" AS a
    SET "courseEditionId" = ${editionId}
    FROM "Employee" AS e
    WHERE a."employeeId" = e."id"
      AND e."clientId" = ${clientId}
      AND a."lessonId" IN (${Prisma.join(lessonIds)})
      AND a."courseEditionId" IS NULL
  `);
}

async function duplicateLessons(
  lessons: LegacyLesson[],
  editionId: string,
  courseId: string,
  hasLessonCourseId: boolean
) {
  const mapping = new Map<string, string>();
  for (const lesson of lessons) {
    const newId = randomUUID();
    if (hasLessonCourseId) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "Lesson" (
          "id",
          "courseId",
          "courseEditionId",
          "date",
          "startTime",
          "endTime",
          "durationHours",
          "title",
          "notes",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${newId},
          ${courseId},
          ${editionId},
          ${lesson.date},
          ${lesson.startTime},
          ${lesson.endTime},
          ${lesson.durationHours},
          ${lesson.title},
          ${lesson.notes},
          ${lesson.createdAt},
          ${lesson.updatedAt}
        )
      `);
    } else {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "Lesson" (
          "id",
          "courseEditionId",
          "date",
          "startTime",
          "endTime",
          "durationHours",
          "title",
          "notes",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${newId},
          ${editionId},
          ${lesson.date},
          ${lesson.startTime},
          ${lesson.endTime},
          ${lesson.durationHours},
          ${lesson.title},
          ${lesson.notes},
          ${lesson.createdAt},
          ${lesson.updatedAt}
        )
      `);
    }
    mapping.set(lesson.id, newId);
  }
  return mapping;
}

async function remapAttendances(
  mapping: Map<string, string>,
  clientId: string,
  editionId: string
) {
  for (const [oldLessonId, newLessonId] of mapping.entries()) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Attendance" AS a
      SET "lessonId" = ${newLessonId},
          "courseEditionId" = ${editionId}
      FROM "Employee" AS e
      WHERE a."employeeId" = e."id"
        AND e."clientId" = ${clientId}
        AND a."lessonId" = ${oldLessonId}
    `);
  }
}

async function main() {
  const hasRegistrationCourseId = await columnExists(
    "CourseRegistration",
    "courseId"
  );
  if (!hasRegistrationCourseId) {
    log(
      "Colonna CourseRegistration.courseId non presente: migrazione già completata o schema aggiornato."
    );
    return;
  }

  const groups = await prisma.$queryRaw<RegistrationGroup[]>(Prisma.sql`
    SELECT "courseId",
           "clientId",
           array_agg("id")::text[] AS "registrationIds"
    FROM "CourseRegistration"
    WHERE "courseId" IS NOT NULL
    GROUP BY "courseId", "clientId"
  `);

  if (groups.length === 0) {
    log("Nessuna registrazione trovata: nessuna edizione da creare.");
    return;
  }

  const hasLegacyLessonUnique = await indexExists(
    "Lesson_courseId_date_startTime_key"
  );
  const hasLessonCourseId = await columnExists("Lesson", "courseId");
  const hasCertificateCourseId = await columnExists("Certificate", "courseId");

  const groupsByCourse = new Map<string, RegistrationGroup[]>();
  for (const group of groups) {
    const bucket = groupsByCourse.get(group.courseId) ?? [];
    bucket.push(group);
    groupsByCourse.set(group.courseId, bucket);
  }

  for (const [courseId, courseGroups] of groupsByCourse.entries()) {
    log(`Corso ${courseId}: ${courseGroups.length} cliente/i`);
    const legacyCourse = await getLegacyCourse(courseId);
    if (!legacyCourse) {
      log(`Corso ${courseId} non trovato, salto.`);
      continue;
    }

    const lessons: LegacyLesson[] = hasLessonCourseId
      ? await prisma.$queryRaw<LegacyLesson[]>(Prisma.sql`
          SELECT * FROM "Lesson"
          WHERE "courseId" = ${courseId}
          ORDER BY "date" ASC, "startTime" ASC
        `)
      : [];

    if (hasLegacyLessonUnique && courseGroups.length > 1 && lessons.length > 0) {
      throw new Error(
        `Indice legacy Lesson_courseId_date_startTime_key presente. ` +
          `Esegui prima la migrazione 20260206133500_fix_lesson_unique.`
      );
    }

    const baseGroup = [...courseGroups].sort(
      (a, b) => b.registrationIds.length - a.registrationIds.length
    )[0];

    for (const group of courseGroups) {
      const edition = await getOrCreateEdition(
        courseId,
        group.clientId,
        legacyCourse
      );

      await updateRegistrations(edition.id, group.registrationIds);
      await updateCertificates(
        edition.id,
        courseId,
        group.clientId,
        hasCertificateCourseId
      );

      if (lessons.length === 0) continue;

      const existingLessons = await prisma.lesson.count({
        where: { courseEditionId: edition.id },
      });
      if (existingLessons > 0) continue;

      const lessonIds = lessons.map((lesson) => lesson.id);

      if (group.clientId === baseGroup.clientId || courseGroups.length === 1) {
        await assignLessonsToEdition(lessonIds, edition.id);
        await updateAttendancesForClient(
          lessonIds,
          edition.id,
          group.clientId
        );
      } else {
        const mapping = await duplicateLessons(
          lessons,
          edition.id,
          courseId,
          hasLessonCourseId
        );
        await remapAttendances(mapping, group.clientId, edition.id);
      }
    }
  }

  log("Migrazione completata.");
}

main()
  .catch((error) => {
    console.error("Migrazione edizioni fallita:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
