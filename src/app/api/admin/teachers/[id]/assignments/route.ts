import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";

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

    const validation = await validateBody(request, createSchema);
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

    const deleted = await prisma.teacherAssignment.deleteMany({
      where: {
        id,
        teacherId: context.params.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Assegnazione non trovata" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ASSIGNMENTS_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

