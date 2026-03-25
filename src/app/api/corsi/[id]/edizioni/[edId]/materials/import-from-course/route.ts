import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { copyCourseMaterialToEdition } from "@/lib/material-storage";
import { checkApiPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "materiali", "create")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const edition = await prisma.courseEdition.findFirst({
    where: { id: context.params.edId, courseId: context.params.id },
    select: { id: true, status: true },
  });
  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }
  if (edition.status === "ARCHIVED") {
    return NextResponse.json({ error: "Edizione archiviata" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const importAll = body?.importAll === true;
  const materialIds: string[] = Array.isArray(body?.materialIds) ? body.materialIds : [];

  if (!importAll && materialIds.length === 0) {
    return NextResponse.json({ error: "Nessun materiale selezionato" }, { status: 400 });
  }

  // Fetch course materials to import
  const courseMaterials = await prisma.courseMaterial.findMany({
    where: {
      courseId: context.params.id,
      ...(importAll ? {} : { id: { in: materialIds } }),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  if (courseMaterials.length === 0) {
    return NextResponse.json({ error: "Nessun materiale trovato nel corso" }, { status: 404 });
  }

  // Check which are already imported
  const existingImports = await prisma.editionMaterial.findMany({
    where: {
      courseEditionId: edition.id,
      sourceCourseMediaId: { in: courseMaterials.map((m) => m.id) },
    },
    select: { sourceCourseMediaId: true, fileName: true },
  });
  const alreadyImported = new Set(existingImports.map((e) => e.sourceCourseMediaId));

  // Get max sortOrder per category in edition
  const maxOrders = await prisma.editionMaterial.groupBy({
    by: ["category"],
    where: { courseEditionId: edition.id },
    _max: { sortOrder: true },
  });
  const categoryMaxOrder: Record<string, number> = {};
  for (const g of maxOrders) {
    categoryMaxOrder[g.category] = g._max.sortOrder ?? 0;
  }

  let imported = 0;
  const skippedNames: string[] = [];

  for (const cm of courseMaterials) {
    if (alreadyImported.has(cm.id)) {
      skippedNames.push(cm.fileName);
      continue;
    }

    try {
      const copied = await copyCourseMaterialToEdition(cm.filePath, edition.id);
      const nextOrder = (categoryMaxOrder[cm.category] ?? 0) + 1;
      categoryMaxOrder[cm.category] = nextOrder;

      await prisma.editionMaterial.create({
        data: {
          courseEditionId: edition.id,
          fileName: cm.fileName,
          filePath: copied.relativePath,
          fileSize: cm.fileSize,
          mimeType: cm.mimeType,
          category: cm.category,
          title: cm.title,
          description: cm.description,
          sortOrder: nextOrder,
          uploadedById: session.user.id,
          uploadedByRole: "ADMIN",
          uploadedByName: session.user.email ?? null,
          status: "APPROVED",
          sourceCourseMediaId: cm.id,
        },
      });
      imported++;
    } catch (err) {
      console.error(`[IMPORT_COURSE_MATERIAL] Error copying ${cm.fileName}:`, err);
    }
  }

  return NextResponse.json({
    imported,
    skipped: skippedNames.length,
    skippedNames,
    total: courseMaterials.length,
  });
}
