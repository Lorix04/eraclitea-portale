import { prisma } from "@/lib/prisma";

/**
 * Synchronise the "Esperienza come docente" CV section
 * with lessons the teacher was actually assigned to in the portal.
 *
 * One TeacherTeachingExperience row per CourseEdition.
 */
export async function syncPortalExperience(teacherId: string) {
  // 1. Fetch all assignments with lesson + edition + course + client
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    include: {
      lesson: {
        include: {
          courseEdition: {
            include: {
              course: { select: { id: true, title: true } },
              client: { select: { id: true, ragioneSociale: true } },
            },
          },
        },
      },
    },
  });

  // 2. Group by courseEditionId
  type EdGroup = {
    courseTitle: string;
    organization: string;
    lessons: typeof assignments;
    totalHours: number;
    startDate: Date;
    endDate: Date;
    locations: string[];
    editionNumber: number;
  };

  const groups = new Map<string, EdGroup>();

  for (const a of assignments) {
    const edId = a.lesson.courseEditionId;
    const ed = a.lesson.courseEdition;
    const existing = groups.get(edId);

    if (!existing) {
      groups.set(edId, {
        courseTitle: ed.course.title,
        organization: ed.client?.ragioneSociale ?? "",
        lessons: [a],
        totalHours: a.lesson.durationHours ?? 0,
        startDate: a.lesson.date,
        endDate: a.lesson.date,
        locations: a.lesson.luogo ? [a.lesson.luogo] : [],
        editionNumber: ed.editionNumber ?? 1,
      });
    } else {
      existing.lessons.push(a);
      existing.totalHours += a.lesson.durationHours ?? 0;
      if (a.lesson.date < existing.startDate) existing.startDate = a.lesson.date;
      if (a.lesson.date > existing.endDate) existing.endDate = a.lesson.date;
      if (a.lesson.luogo && !existing.locations.includes(a.lesson.luogo)) {
        existing.locations.push(a.lesson.luogo);
      }
    }
  }

  // 3. Fetch existing portal entries
  const existingPortal = await prisma.teacherTeachingExperience.findMany({
    where: { teacherId, isFromPortal: true },
  });

  const existingByEdition = new Map<string, (typeof existingPortal)[0]>();
  for (const e of existingPortal) {
    if (e.courseEditionId) {
      existingByEdition.set(e.courseEditionId, e);
    }
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // 4. Get max sortOrder for new entries
  const maxSort = await prisma.teacherTeachingExperience.aggregate({
    where: { teacherId },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  // 5. Upsert for each edition group
  for (const [edId, group] of groups) {
    const location = group.locations.join(", ");
    const lessonCount = group.lessons.length;
    const description = `Docente per il corso ${group.courseTitle}, Edizione #${group.editionNumber}. ${lessonCount} ${lessonCount === 1 ? "lezione erogata" : "lezioni erogate"}.`;

    const data = {
      courseTitle: group.courseTitle,
      organization: group.organization,
      startDate: group.startDate,
      endDate: group.endDate,
      totalHours: Math.round(group.totalHours * 100) / 100,
      location: location || null,
      description,
      isFromPortal: true,
      courseEditionId: edId,
    };

    const existing = existingByEdition.get(edId);
    if (existing) {
      await prisma.teacherTeachingExperience.update({
        where: { id: existing.id },
        data,
      });
      updated++;
      existingByEdition.delete(edId);
    } else {
      await prisma.teacherTeachingExperience.create({
        data: {
          ...data,
          teacherId,
          sortOrder: nextSort++,
        },
      });
      created++;
    }
  }

  // 6. Delete portal entries for editions no longer assigned
  for (const [, orphan] of existingByEdition) {
    await prisma.teacherTeachingExperience.delete({
      where: { id: orphan.id },
    });
    deleted++;
  }

  return { created, updated, deleted, total: groups.size };
}
