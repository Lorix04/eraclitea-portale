import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { checkApiPermission } from "@/lib/permissions";
import { notifyEditionUsers } from "@/lib/notify-client";

const querySchema = z.object({
  editionId: z.string().optional(),
});

const createSchema = z.object({
  sessionIds: z.array(z.string()).optional(),
  lessonIds: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const deleteSchema = z.object({
  id: z.string().min(1, "ID assegnazione obbligatorio"),
});

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "view")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const { editionId } = validation.data;
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
        ...(editionId
          ? {
              lesson: {
                courseEditionId: editionId,
              },
            }
          : {}),
      },
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
      orderBy: { lesson: { date: "asc" } },
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ASSIGNMENTS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = await validateBody(request, createSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, userId: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const data = validation.data;
    const lessonIds = data.lessonIds ?? data.sessionIds ?? [];
    if (lessonIds.length === 0) {
      return NextResponse.json(
        { error: "Seleziona almeno una lezione" },
        { status: 400 }
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingLessons.map((lesson) => lesson.id));
    const missing = lessonIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Una o più lezioni non esistono", missingLessonIds: missing },
        { status: 400 }
      );
    }

    const result = await prisma.teacherAssignment.createMany({
      data: lessonIds.map((lessonId) => ({
        teacherId: teacher.id,
        lessonId,
        notes: data.notes?.trim() || null,
      })),
      skipDuplicates: true,
    });

    // Send batch email + notification for assigned lessons
    if (result.count > 0) {
      const { sendLessonAssignedEmails } = await import("@/lib/teacher-lesson-emails");
      void sendLessonAssignedEmails(teacher.id, lessonIds);

      // Notify client users about teacher assignment
      try {
        const teacherInfo = await prisma.teacher.findUnique({
          where: { id: teacher.id },
          select: { firstName: true, lastName: true },
        });
        const editions = await prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { courseEdition: { select: { id: true, clientId: true, editionNumber: true, status: true, course: { select: { title: true } } } } },
          distinct: ["courseEditionId"],
        });
        const teacherName = `${teacherInfo?.firstName ?? ""} ${teacherInfo?.lastName ?? ""}`.trim() || "Nuovo docente";
        for (const lesson of editions) {
          const ed = lesson.courseEdition;
          if (ed.status === "PUBLISHED" && ed.clientId) {
            void notifyEditionUsers({
              editionId: ed.id,
              clientId: ed.clientId,
              type: "TEACHER_CHANGED",
              title: "Docente aggiornato",
              message: `Il docente per ${ed.course.title} (Ed. #${ed.editionNumber}) è ora ${teacherName}.`,
              courseEditionId: ed.id,
            });
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true, created: result.count });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ASSIGNMENTS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => null);
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "ID assegnazione obbligatorio" },
          { status: 400 }
        );
      }
      id = parsed.data.id;
    }

    // Fetch assignment details before deleting (for email notification)
    const assignment = await prisma.teacherAssignment.findFirst({
      where: { id, teacherId: context.params.id },
      select: { id: true, lessonId: true, teacherId: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assegnazione non trovata" },
        { status: 404 }
      );
    }

    await prisma.teacherAssignment.delete({
      where: { id: assignment.id },
    });

    // Send email + notification for removal
    const { sendLessonRemovedEmail } = await import("@/lib/teacher-lesson-emails");
    void sendLessonRemovedEmail(assignment.teacherId, assignment.lessonId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ASSIGNMENTS_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

