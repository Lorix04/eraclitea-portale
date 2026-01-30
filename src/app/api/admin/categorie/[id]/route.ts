import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  courseIds: z.array(z.string().cuid()).optional(),
  clientIds: z.array(z.string().cuid()).optional(),
});

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = await prisma.category.findUnique({
    where: { id: context.params.id },
    include: {
      courses: { include: { course: { select: { id: true, title: true, status: true } } } },
      clients: { include: { client: { select: { id: true, ragioneSociale: true, isActive: true } } } },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Categoria non trovata" }, { status: 404 });
  }

  return NextResponse.json({ data: category });
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, color, courseIds, clientIds } = parsed.data;
  const existing = await prisma.category.findUnique({
    where: { id: context.params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Categoria non trovata" }, { status: 404 });
  }

  if (name && name !== existing.name) {
    const duplicate = await prisma.category.findUnique({ where: { name } });
    if (duplicate) {
      return NextResponse.json(
        { error: "Esiste gia una categoria con questo nome" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCategory = await tx.category.update({
      where: { id: context.params.id },
      data: {
        name: name ?? undefined,
        description: description === "" ? null : description,
        color: color === "" ? undefined : color,
      },
    });

    if (courseIds !== undefined) {
      await tx.courseCategory.deleteMany({
        where: { categoryId: context.params.id },
      });
      if (courseIds.length) {
        await tx.courseCategory.createMany({
          data: courseIds.map((courseId) => ({
            courseId,
            categoryId: context.params.id,
          })),
        });
      }
    }

    if (clientIds !== undefined) {
      await tx.clientCategory.deleteMany({
        where: { categoryId: context.params.id },
      });
      if (clientIds.length) {
        await tx.clientCategory.createMany({
          data: clientIds.map((clientId) => ({
            clientId,
            categoryId: context.params.id,
          })),
        });
      }
    }

    return updatedCategory;
  });

  await logAudit({
    userId: session.user.id,
    action: "CATEGORY_UPDATE",
    entityType: "Category",
    entityId: updated.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = await prisma.category.findUnique({
    where: { id: context.params.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria non trovata" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id: context.params.id } });

  await logAudit({
    userId: session.user.id,
    action: "CATEGORY_DELETE",
    entityType: "Category",
    entityId: context.params.id,
    ipAddress: getClientIP(_request),
  });

  return NextResponse.json({ ok: true });
}
