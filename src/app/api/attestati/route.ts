import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  search: z.string().optional(),
  searchEmployee: z.string().optional(),
  clientId: z.string().optional(),
  employeeId: z.string().optional(),
  courseId: z.string().optional(),
  courseEditionId: z.string().optional(),
  expiryStatus: z.enum(["all", "valid", "expiring", "expired"]).default("all"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  period: z.enum(["all", "today", "week", "month", "year"]).default("all"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const {
    page,
    limit,
    search,
    searchEmployee,
    clientId,
    employeeId,
    courseId,
    courseEditionId: validatedCourseEditionId,
    expiryStatus,
    sortOrder,
    period,
    dateFrom,
    dateTo,
  } = validation.data;
  const courseEditionId = validatedCourseEditionId ?? undefined;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const skip = (safePage - 1) * safeLimit;

  const isAdmin = session.user.role === "ADMIN";
  const scopedClientId = isAdmin ? clientId : session.user.clientId;

  if (!isAdmin && !scopedClientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const where: Prisma.CertificateWhereInput = {
    ...(scopedClientId ? { clientId: scopedClientId } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  if (courseEditionId === "external") {
    where.courseEditionId = null;
  } else if (courseEditionId) {
    where.courseEditionId = courseEditionId;
  }

  const andFilters: Prisma.CertificateWhereInput[] = [];

  if (courseId) {
    andFilters.push({
      courseEdition: {
        courseId,
      },
    });
  }

  if (search) {
    andFilters.push({
      OR: [
        { filePath: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          courseEdition: {
            course: {
              title: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      ],
    });
  }

  if (searchEmployee) {
    andFilters.push({
      employee: {
        OR: [
          { nome: { contains: searchEmployee, mode: Prisma.QueryMode.insensitive } },
          { cognome: { contains: searchEmployee, mode: Prisma.QueryMode.insensitive } },
        ],
      },
    });
  }

  const hasCustomDate = Boolean(dateFrom || dateTo);
  if (hasCustomDate) {
    const range: Prisma.DateTimeFilter = {};
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
    if (Object.keys(range).length > 0) {
      andFilters.push({ uploadedAt: range });
    }
  } else if (period && period !== "all") {
    const now = new Date();
    const from = new Date(now);
    switch (period) {
      case "today":
        from.setHours(0, 0, 0, 0);
        break;
      case "week":
        from.setDate(from.getDate() - 7);
        break;
      case "month":
        from.setMonth(from.getMonth() - 1);
        break;
      case "year":
        from.setFullYear(from.getFullYear() - 1);
        break;
      default:
        break;
    }
    andFilters.push({ uploadedAt: { gte: from } });
  }

  if (expiryStatus && expiryStatus !== "all") {
    const now = new Date();
    const in90Days = new Date(now);
    in90Days.setDate(in90Days.getDate() + 90);

    if (expiryStatus === "expired") {
      andFilters.push({ expiresAt: { lt: now } });
    } else if (expiryStatus === "expiring") {
      andFilters.push({ expiresAt: { gte: now, lte: in90Days } });
    } else if (expiryStatus === "valid") {
      andFilters.push({
        OR: [{ expiresAt: null }, { expiresAt: { gt: in90Days } }],
      });
    }
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  const [certificates, total] = await prisma.$transaction([
    prisma.certificate.findMany({
      where,
      include: {
        employee: { select: { id: true, nome: true, cognome: true } },
        courseEdition: {
          select: {
            id: true,
            editionNumber: true,
            course: { select: { id: true, title: true } },
          },
        },
        client: { select: { id: true, ragioneSociale: true } },
        uploader: { select: { email: true } },
      },
      orderBy: { uploadedAt: sortOrder as Prisma.SortOrder },
      skip,
      take: safeLimit,
    }),
    prisma.certificate.count({ where }),
  ]);

    return NextResponse.json({
      data: certificates,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  } catch (error) {
    console.error("[CERTIFICATES_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Upload non ancora implementato" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[CERTIFICATES_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
