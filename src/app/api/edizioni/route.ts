import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

const querySchema = z.object({
  clientId: z.string().optional(),
  courseId: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z
    .enum([
      "course",
      "client",
      "editionNumber",
      "startDate",
      "endDate",
      "deadlineRegistry",
      "status",
      "participants",
    ])
    .default("client"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(200),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const {
    clientId,
    courseId,
    status,
    search,
    categoryId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 200;
  const skip = (safePage - 1) * safeLimit;

  const filters: Prisma.CourseEditionWhereInput[] = [];

  if (clientId) filters.push({ clientId });
  if (courseId) filters.push({ courseId });
  if (status) filters.push({ status });

  if (search) {
    filters.push({
      OR: [
        {
          course: {
            title: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          client: {
            ragioneSociale: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      ],
    });
  }

  if (categoryId) {
    filters.push({
      course: {
        categories: {
          some: { categoryId },
        },
      },
    });
  }

  if (dateFrom || dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(`${dateTo}T23:59:59.999Z`);
    filters.push({ startDate: dateFilter });
  }

  const where: Prisma.CourseEditionWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const order: Prisma.SortOrder = sortOrder === "asc" ? "asc" : "desc";
  let orderBy: Prisma.CourseEditionOrderByWithRelationInput[] = [];

  switch (sortBy) {
    case "course":
      orderBy = [
        { course: { title: order } },
        { client: { ragioneSociale: order } },
      ];
      break;
    case "client":
      orderBy = [
        { client: { ragioneSociale: order } },
        { course: { title: order } },
      ];
      break;
    case "editionNumber":
      orderBy = [{ editionNumber: order }];
      break;
    case "endDate":
      orderBy = [{ endDate: order }];
      break;
    case "deadlineRegistry":
      orderBy = [{ deadlineRegistry: order }];
      break;
    case "status":
      orderBy = [{ status: order }];
      break;
    case "participants":
      orderBy = [{ registrations: { _count: order } }];
      break;
    case "startDate":
    default:
      orderBy = [{ startDate: order }];
      break;
  }

  orderBy.push({ editionNumber: "desc" });

  const [editions, total] = await prisma.$transaction([
    prisma.courseEdition.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        client: { select: { id: true, ragioneSociale: true } },
        _count: { select: { registrations: true } },
      },
      orderBy,
      skip,
      take: safeLimit,
    }),
    prisma.courseEdition.count({ where }),
  ]);

  return NextResponse.json({
    data: editions,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  });
}
