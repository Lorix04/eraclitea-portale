import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MATERIAL_ALLOWED_TYPES,
  MATERIAL_MAX_SIZE_BYTES,
} from "@/lib/material-storage-shared";
import { saveCourseMaterial, deleteMaterial } from "@/lib/material-storage";
import { checkApiPermission, canAccessArea } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessArea(session.user.permissions, "materiali", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;

  const materials = await prisma.courseMaterial.findMany({
    where: {
      courseId: context.params.id,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const categoryCounts: Record<string, number> = {};
  const allMaterials = category
    ? await prisma.courseMaterial.findMany({
        where: { courseId: context.params.id },
        select: { category: true },
      })
    : materials;
  for (const m of allMaterials) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  return NextResponse.json({
    materials,
    categories: categoryCounts,
    totalCount: allMaterials.length,
  });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "materiali", "create")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const titleRaw = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim();

  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  if (!titleRaw) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Categoria obbligatoria" }, { status: 400 });
  }
  if (!MATERIAL_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Tipo file non supportato" }, { status: 400 });
  }
  if (file.size > MATERIAL_MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 400 });
  }

  const saved = await saveCourseMaterial(file, course.id);

  const maxOrder = await prisma.courseMaterial.aggregate({
    where: { courseId: course.id, category },
    _max: { sortOrder: true },
  });

  const material = await prisma.courseMaterial.create({
    data: {
      courseId: course.id,
      fileName: file.name,
      filePath: saved.relativePath,
      fileSize: file.size,
      mimeType: file.type,
      category,
      title: titleRaw,
      description,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      uploadedById: session.user.id,
      uploadedByName: session.user.email ?? null,
    },
  });

  return NextResponse.json({ data: material }, { status: 201 });
}
