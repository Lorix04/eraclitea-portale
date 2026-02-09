import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getClientIP, logAudit } from "@/lib/audit";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  courseIds: z.array(z.string().cuid()).optional(),
  clientIds: z.array(z.string().cuid()).optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeStats = searchParams.get("stats") === "true";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder: Prisma.SortOrder =
    searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const where = search
    ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
    : undefined;

  let orderBy: Prisma.CategoryOrderByWithRelationInput = { name: "asc" };
  if (sortBy === "createdAt") {
    orderBy = { createdAt: sortOrder };
  } else if (sortBy === "coursesCount") {
    orderBy = { courses: { _count: sortOrder } };
  } else {
    orderBy = { name: sortOrder };
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      courses: includeStats
        ? { include: { course: { select: { id: true, title: true } } } }
        : false,
      clients: includeStats
        ? { include: { client: { select: { id: true, ragioneSociale: true, isActive: true } } } }
        : false,
      _count: { select: { courses: true, clients: true } },
    },
    orderBy,
  });

  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, color, courseIds, clientIds } = parsed.data;

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "Esiste gia una categoria con questo nome" },
      { status: 400 }
    );
  }

  const category = await prisma.category.create({
    data: {
      name,
      description: description || null,
      color: color || "#6B7280",
      courses: courseIds?.length
        ? {
            createMany: {
              data: courseIds.map((courseId) => ({ courseId })),
            },
          }
        : undefined,
      clients: clientIds?.length
        ? {
            createMany: {
              data: clientIds.map((clientId) => ({ clientId })),
            },
          }
        : undefined,
    },
    include: { _count: { select: { courses: true, clients: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: category.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: category }, { status: 201 });
}
