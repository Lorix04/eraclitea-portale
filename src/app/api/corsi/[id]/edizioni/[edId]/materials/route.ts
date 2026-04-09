import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { notifyEditionUsers } from "@/lib/notify-client";
import { prisma } from "@/lib/prisma";
import { validateFileContent } from "@/lib/security";
import {
  saveMaterial,
  deleteMaterial,
  MATERIAL_CATEGORIES,
  MATERIAL_ALLOWED_TYPES,
  MATERIAL_MAX_SIZE_BYTES,
} from "@/lib/material-storage";
import { checkApiPermission, canAccessArea } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

    if (isAdminView) {
      if (!canAccessArea(session.user.permissions, "materiali", session.user.isSuperAdmin)) {
        return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
      }
    }

    const clientId = isAdminView
      ? null
      : effectiveClient?.clientId ?? null;

    const isTeacher =
      session.user.role === "TEACHER" && !!session.user.teacherId;

    if (!isAdminView && !clientId && !isTeacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: { id: true, courseId: true, clientId: true },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    if (!isAdminView && !isTeacher && edition.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isTeacher) {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: session.user.teacherId!,
          lesson: { courseEditionId: edition.id },
        },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      courseEditionId: edition.id,
    };
    if (category) {
      where.category = category;
    }
    if (!isAdminView) {
      where.status = "APPROVED";
    }
    if (isTeacher) {
      // Teacher sees APPROVED + own pending/rejected
      where.OR = [
        { status: "APPROVED" },
        { uploadedById: session.user.id },
      ];
      delete where.status;
    }

    const materials = await prisma.editionMaterial.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    const countFilter: Record<string, unknown> = {
      courseEditionId: edition.id,
    };
    if (!isAdminView && !isTeacher) {
      countFilter.status = "APPROVED";
    }
    if (isTeacher) {
      countFilter.OR = [
        { status: "APPROVED" },
        { uploadedById: session.user.id },
      ];
    }

    const allMaterials = await prisma.editionMaterial.findMany({
      where: countFilter,
      select: { category: true },
    });

    const categoryCounts: Record<string, number> = {};
    for (const m of allMaterials) {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    }

    return NextResponse.json({ data: materials, categoryCounts });
  } catch (error) {
    console.error("[MATERIALS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

    if (isAdminView) {
      if (!checkApiPermission(session, "materiali", "create")) {
        return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
      }
    }

    const clientId = isAdminView
      ? null
      : effectiveClient?.clientId ?? null;

    const isTeacher =
      session.user.role === "TEACHER" && !!session.user.teacherId;

    if (!isAdminView && !clientId && !isTeacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: { id: true, courseId: true, clientId: true },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    if (!isAdminView && !isTeacher && edition.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isTeacher) {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: session.user.teacherId!,
          lesson: { courseEditionId: edition.id },
        },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const category = formData.get("category") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File obbligatorio" },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Titolo obbligatorio" },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: "Titolo troppo lungo (max 200 caratteri)" },
        { status: 400 }
      );
    }

    if (!category || !(category in MATERIAL_CATEGORIES)) {
      return NextResponse.json(
        { error: "Categoria non valida" },
        { status: 400 }
      );
    }

    if (!MATERIAL_ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo di file non consentito" },
        { status: 400 }
      );
    }

    const contentValid = await validateFileContent(file, file.type);
    if (!contentValid) {
      return NextResponse.json(
        { error: "Il contenuto del file non corrisponde al tipo dichiarato" },
        { status: 400 }
      );
    }

    if (file.size > MATERIAL_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File troppo grande (max 50MB)" },
        { status: 400 }
      );
    }

    const { relativePath } = await saveMaterial(file, edition.id);

    try {
      const maxSort = await prisma.editionMaterial.aggregate({
        where: {
          courseEditionId: edition.id,
          category,
        },
        _max: { sortOrder: true },
      });

      const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

      const uploadedByRole = isTeacher
        ? "TEACHER"
        : isAdminView
          ? "ADMIN"
          : "CLIENT";

      const uploadedById = isTeacher
        ? session.user.id
        : isAdminView
          ? session.user.id
          : effectiveClient!.userId;

      const newMaterial = await prisma.editionMaterial.create({
        data: {
          courseEditionId: edition.id,
          fileName: file.name,
          filePath: relativePath,
          fileSize: file.size,
          mimeType: file.type,
          category,
          title: title.trim(),
          description: description?.trim() || null,
          sortOrder: nextSortOrder,
          uploadedById,
          uploadedByRole,
          uploadedByName: session.user.name || session.user.email || null,
          status: isTeacher ? "PENDING" : "APPROVED",
        },
      });

      // Notify assigned teachers when admin/client uploads a material
      if (uploadedByRole !== "TEACHER") {
        try {
          const teacherAssignments = await prisma.teacherAssignment.findMany({
            where: { lesson: { courseEditionId: edition.id } },
            select: { teacher: { select: { userId: true } } },
            distinct: ["teacherId"],
          });
          const { createTeacherNotification } = await import(
            "@/lib/teacher-notifications"
          );
          for (const a of teacherAssignments) {
            if (a.teacher.userId) {
              void createTeacherNotification({
                userId: a.teacher.userId,
                type: "MATERIAL_UPLOADED",
                title: "Nuovo materiale disponibile",
                message: `Nuovo materiale "${title}" caricato`,
                courseEditionId: edition.id,
              });
            }
          }
        } catch {
          /* ignore notification errors */
        }
      }

      // Notify client users when admin/teacher uploads a material
      if (uploadedByRole !== "CLIENT" && edition.clientId) {
        void notifyEditionUsers({
          editionId: edition.id,
          clientId: edition.clientId,
          type: "MATERIAL_UPLOADED",
          title: "Nuovo materiale disponibile",
          message: `Nuovo documento "${title!.trim()}" disponibile per il tuo corso.`,
          courseEditionId: edition.id,
        });
      }

      return NextResponse.json({ data: newMaterial }, { status: 201 });
    } catch (dbError) {
      await deleteMaterial(relativePath);
      throw dbError;
    }
  } catch (error) {
    console.error("[MATERIALS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
