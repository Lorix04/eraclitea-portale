import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { courseSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const categoryId = searchParams.get("categoryId");
  const visibilityTypeParam = searchParams.get("visibilityType");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder: Prisma.SortOrder =
    searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }
  if (search) {
    where.title = { contains: search, mode: Prisma.QueryMode.insensitive };
  }
  if (categoryId) {
    where.categories = { some: { categoryId } };
  }
  if (visibilityTypeParam) {
    const normalized =
      visibilityTypeParam === "PUBLIC"
        ? "ALL"
        : visibilityTypeParam === "PRIVATE"
          ? "SELECTED_CLIENTS"
          : visibilityTypeParam;
    where.visibilityType = normalized;
  }
  if (dateFrom || dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        range.gte = parsed;
      }
    }
    if (dateTo) {
      const parsed = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(parsed.getTime())) {
        range.lte = parsed;
      }
    }
    if (Object.keys(range).length) {
      where.dateStart = range;
    }
  }

  let orderBy: Prisma.CourseOrderByWithRelationInput = {
    createdAt: "desc",
  };
  if (sortBy === "title") {
    orderBy = { title: sortOrder };
  } else if (sortBy === "dateStart") {
    orderBy = { dateStart: sortOrder };
  } else {
    orderBy = { createdAt: sortOrder };
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      visibility: true,
      categories: { include: { category: true } },
      _count: { select: { registrations: true, lessons: true } },
    },
    orderBy,
  });

  return NextResponse.json({ data: courses });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, courseSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const data = validation.data;
  const visibilityClientIds: string[] = data.visibilityClientIds ?? [];
  const visibilityCategoryIds: string[] = data.visibilityCategoryIds ?? [];
  const categoryIds: string[] = data.categoryIds ?? [];
  const visibilityType =
    data.visibilityType ??
    (visibilityCategoryIds.length
      ? "BY_CATEGORY"
      : visibilityClientIds.length
        ? "SELECTED_CLIENTS"
        : "ALL");

  const course = await prisma.course.create({
    data: {
      title: data.title,
      description: data.description || null,
      durationHours:
        typeof data.durationHours === "number" ? data.durationHours : null,
      dateStart: data.dateStart instanceof Date ? data.dateStart : null,
      dateEnd: data.dateEnd instanceof Date ? data.dateEnd : null,
      deadlineRegistry:
        data.deadlineRegistry instanceof Date ? data.deadlineRegistry : null,
      status: data.status ?? "DRAFT",
      visibilityType,
      visibility: visibilityType === "SELECTED_CLIENTS" && visibilityClientIds.length
        ? {
            createMany: {
              data: visibilityClientIds.map((clientId) => ({ clientId })),
            },
          }
        : undefined,
      visibilityCategories:
        visibilityType === "BY_CATEGORY" && visibilityCategoryIds.length
          ? {
              createMany: {
                data: visibilityCategoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : undefined,
      categories: categoryIds.length
        ? {
            createMany: {
              data: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
        : undefined,
    },
    include: {
      visibility: true,
      visibilityCategories: { include: { category: true } },
      categories: { include: { category: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "COURSE_CREATE",
    entityType: "Course",
    entityId: course.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: course }, { status: 201 });
}

// PUT/DELETE handled in /api/corsi/[id]
