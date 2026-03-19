import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { deleteMaterial, MATERIAL_CATEGORIES } from "@/lib/material-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

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

    const material = await prisma.editionMaterial.findUnique({
      where: { id: context.params.materialId },
    });

    if (!material || material.courseEditionId !== edition.id) {
      return NextResponse.json(
        { error: "Materiale non trovato" },
        { status: 404 }
      );
    }

    // Teacher can only edit own materials with PENDING status
    if (isTeacher) {
      if (
        material.uploadedById !== session.user.id ||
        material.status !== "PENDING"
      ) {
        return NextResponse.json(
          { error: "Non puoi modificare questo materiale" },
          { status: 403 }
        );
      }
    } else if (
      !isAdminView &&
      material.uploadedById !== (effectiveClient?.userId ?? session.user.id)
    ) {
      return NextResponse.json(
        { error: "Non puoi modificare questo materiale" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category } = body as {
      title?: string;
      description?: string;
      category?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title.trim()) {
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
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (category !== undefined) {
      if (!(category in MATERIAL_CATEGORIES)) {
        return NextResponse.json(
          { error: "Categoria non valida" },
          { status: 400 }
        );
      }
      updateData.category = category;
    }

    const updatedMaterial = await prisma.editionMaterial.update({
      where: { id: context.params.materialId },
      data: updateData,
    });

    return NextResponse.json({ data: updatedMaterial });
  } catch (error) {
    console.error("[MATERIAL_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; edId: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

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

    const material = await prisma.editionMaterial.findUnique({
      where: { id: context.params.materialId },
    });

    if (!material || material.courseEditionId !== edition.id) {
      return NextResponse.json(
        { error: "Materiale non trovato" },
        { status: 404 }
      );
    }

    // Teacher can only delete own materials with PENDING status
    if (isTeacher) {
      if (
        material.uploadedById !== session.user.id ||
        material.status !== "PENDING"
      ) {
        return NextResponse.json(
          { error: "Non puoi eliminare questo materiale" },
          { status: 403 }
        );
      }
    } else if (
      !isAdminView &&
      material.uploadedById !== (effectiveClient?.userId ?? session.user.id)
    ) {
      return NextResponse.json(
        { error: "Non puoi eliminare questo materiale" },
        { status: 403 }
      );
    }

    await deleteMaterial(material.filePath);

    await prisma.editionMaterial.delete({
      where: { id: context.params.materialId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[MATERIAL_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
