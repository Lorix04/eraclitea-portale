import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { readMaterial, MATERIAL_CATEGORIES } from "@/lib/material-storage";
import archiver from "archiver";
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
      status: "APPROVED",
    };
    if (category) {
      where.category = category;
    }

    const materials = await prisma.editionMaterial.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    if (materials.length === 0) {
      return NextResponse.json(
        { error: "Nessun materiale disponibile" },
        { status: 404 }
      );
    }

    // Create archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Add files organized by category
    for (const material of materials) {
      try {
        const { buffer } = await readMaterial(material.filePath);
        const categoryLabel =
          MATERIAL_CATEGORIES[material.category as keyof typeof MATERIAL_CATEGORIES] ||
          material.category;
        archive.append(buffer, {
          name: `${categoryLabel}/${material.fileName}`,
        });
      } catch {
        /* skip missing files */
      }
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="materiali.zip"`,
      },
    });
  } catch (error) {
    console.error("[MATERIALS_DOWNLOAD_ZIP] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
