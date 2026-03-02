import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { deleteTeacherCv } from "@/lib/teacher-cv-storage";

const teacherUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(100).optional(),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(100).optional(),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  specialization: z.string().trim().max(150).optional().or(z.literal("")),
  categoryIds: z.array(z.string().cuid()).optional(),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
        assignments: {
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
        },
        unavailabilities: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
        _count: { select: { assignments: true, unavailabilities: true } },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    return NextResponse.json({ data: teacher });
  } catch (error) {
    console.error("[ADMIN_TEACHER_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = await validateBody(request, teacherUpdateSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const existing = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const data = validation.data;
    const teacher = await prisma.teacher.update({
      where: { id: context.params.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email !== undefined ? (data.email.trim() || null) : undefined,
        phone: data.phone !== undefined ? (data.phone.trim() || null) : undefined,
        specialization:
          data.specialization !== undefined
            ? data.specialization.trim() || null
            : undefined,
        categories:
          data.categoryIds !== undefined
            ? {
                set: data.categoryIds.map((categoryId) => ({ id: categoryId })),
              }
            : undefined,
        bio: data.bio !== undefined ? data.bio.trim() || null : undefined,
        notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
        active: data.active,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json({ data: teacher });
  } catch (error) {
    console.error("[ADMIN_TEACHER_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, cvPath: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    await deleteTeacherCv(existing.cvPath);
    await prisma.teacher.delete({ where: { id: context.params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
