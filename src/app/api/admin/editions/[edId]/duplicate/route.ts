import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

const duplicateSchema = z.object({
  duplicateLessons: z.boolean().optional(),
  duplicateLesson: z.boolean().optional(),
  duplicateTeachers: z.boolean().optional(),
  duplicateMinPresence: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

function getPlaceholderLessonDate(index: number) {
  const base = new Date(Date.UTC(1970, 0, 1));
  base.setUTCDate(base.getUTCDate() + index);
  return base;
}

function buildDuplicatedLessonNotes(notes: string | null) {
  const marker = "Data da definire (lezione duplicata automaticamente).";
  if (!notes || !notes.trim()) {
    return marker;
  }
  return `${notes}\n${marker}`;
}

export async function GET(
  _request: Request,
  context: { params: { edId: string } }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const original = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: {
        id: true,
        courseId: true,
        clientId: true,
        editionNumber: true,
        presenzaMinimaType: true,
        presenzaMinimaValue: true,
        course: { select: { title: true } },
        client: { select: { ragioneSociale: true } },
        lessons: {
          select: {
            id: true,
            teacherAssignments: { select: { id: true } },
          },
        },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    const maxEdition = await prisma.courseEdition.aggregate({
      where: {
        courseId: original.courseId,
        clientId: original.clientId,
      },
      _max: { editionNumber: true },
    });
    const nextEditionNumber = (maxEdition._max.editionNumber ?? 0) + 1;

    const teacherAssignmentsCount = original.lessons.reduce(
      (acc, lesson) => acc + lesson.teacherAssignments.length,
      0
    );

    return NextResponse.json({
      success: true,
      preview: {
        id: original.id,
        editionNumber: original.editionNumber,
        nextEditionNumber,
        courseName: original.course.title,
        clientName: original.client.ragioneSociale,
        lessonsCount: original.lessons.length,
        teacherAssignmentsCount,
        presenzaMinimaType: original.presenzaMinimaType,
        presenzaMinimaValue: original.presenzaMinimaValue,
      },
    });
  } catch (error) {
    console.error("[ADMIN_EDITION_DUPLICATE_PREVIEW] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { edId: string } }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "edizioni", "duplicate")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const parsedBody = duplicateSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload non valido" },
        { status: 400 }
      );
    }

    const duplicateLessons =
      parsedBody.data.duplicateLessons ??
      parsedBody.data.duplicateLesson ??
      true;
    const duplicateTeachersRequested = parsedBody.data.duplicateTeachers ?? true;
    const duplicateTeachers = duplicateLessons && duplicateTeachersRequested;
    const duplicateMinPresence = parsedBody.data.duplicateMinPresence ?? true;

    const original = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      include: {
        course: { select: { id: true, title: true } },
        client: { select: { id: true, ragioneSociale: true } },
        lessons: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: {
            teacherAssignments: {
              select: {
                teacherId: true,
                notes: true,
              },
            },
          },
        },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    const maxEdition = await prisma.courseEdition.aggregate({
      where: {
        courseId: original.courseId,
        clientId: original.clientId,
      },
      _max: { editionNumber: true },
    });
    const newEditionNumber = (maxEdition._max.editionNumber ?? 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      const newEdition = await tx.courseEdition.create({
        data: {
          courseId: original.courseId,
          clientId: original.clientId,
          editionNumber: newEditionNumber,
          status: "DRAFT",
          startDate: null,
          endDate: null,
          deadlineRegistry: null,
          notes: original.notes,
          presenzaMinimaType: duplicateMinPresence
            ? original.presenzaMinimaType
            : null,
          presenzaMinimaValue: duplicateMinPresence
            ? original.presenzaMinimaValue
            : null,
        },
      });

      const lessonMap = new Map<string, string>();
      let lessonsCreated = 0;
      let teacherAssignmentsCreated = 0;

      if (duplicateLessons) {
        for (const [index, lesson] of original.lessons.entries()) {
          const createdLesson = await tx.lesson.create({
            data: {
              courseEditionId: newEdition.id,
              date: getPlaceholderLessonDate(index),
              startTime: lesson.startTime,
              endTime: lesson.endTime,
              durationHours: lesson.durationHours,
              luogo: lesson.luogo,
              title: lesson.title,
              notes: buildDuplicatedLessonNotes(lesson.notes),
            },
          });
          lessonMap.set(lesson.id, createdLesson.id);
          lessonsCreated += 1;
        }
      }

      if (duplicateTeachers && lessonMap.size > 0) {
        const teacherAssignmentsData: Array<{
          teacherId: string;
          lessonId: string;
          notes: string | null;
        }> = [];

        for (const lesson of original.lessons) {
          const newLessonId = lessonMap.get(lesson.id);
          if (!newLessonId) continue;
          for (const assignment of lesson.teacherAssignments) {
            teacherAssignmentsData.push({
              teacherId: assignment.teacherId,
              lessonId: newLessonId,
              notes: assignment.notes ?? null,
            });
          }
        }

        if (teacherAssignmentsData.length > 0) {
          const createdAssignments = await tx.teacherAssignment.createMany({
            data: teacherAssignmentsData,
            skipDuplicates: true,
          });
          teacherAssignmentsCreated = createdAssignments.count;
        }
      }

      return {
        newEdition,
        lessonsCreated,
        teacherAssignmentsCreated,
      };
    });

    return NextResponse.json({
      success: true,
      edition: result.newEdition,
      editionNumber: newEditionNumber,
      lessonsCreated: result.lessonsCreated,
      teacherAssignmentsCreated: result.teacherAssignmentsCreated,
    });
  } catch (error) {
    console.error("[ADMIN_EDITION_DUPLICATE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
