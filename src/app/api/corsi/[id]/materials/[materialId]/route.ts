import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteMaterial } from "@/lib/material-storage";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PUT(
  request: Request,
  context: { params: { id: string; materialId: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const material = await prisma.courseMaterial.findFirst({
    where: { id: context.params.materialId, courseId: context.params.id },
  });
  if (!material) {
    return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
  }

  const updated = await prisma.courseMaterial.update({
    where: { id: material.id },
    data: {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; materialId: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const material = await prisma.courseMaterial.findFirst({
    where: { id: context.params.materialId, courseId: context.params.id },
  });
  if (!material) {
    return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
  }

  await deleteMaterial(material.filePath);
  await prisma.courseMaterial.delete({ where: { id: material.id } });

  return NextResponse.json({ ok: true });
}
