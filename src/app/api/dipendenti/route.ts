import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

const querySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  searchEmail: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  hasCourses: z.enum(["all", "with", "without"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const {
    search,
    clientId,
    searchEmail,
    sortBy = "createdAt",
    sortOrder = "desc",
    hasCourses = "all",
    page,
    limit,
  } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const skip = (safePage - 1) * safeLimit;

  const isAdmin = session.user.role === "ADMIN";
  const scopedClientId = isAdmin ? clientId : session.user.clientId;

  if (!isAdmin && !scopedClientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const where: Prisma.EmployeeWhereInput = {
    ...(scopedClientId ? { clientId: scopedClientId } : {}),
  };

  const andFilters: Prisma.EmployeeWhereInput[] = [];
  if (search) {
    andFilters.push({
      OR: [
        { nome: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { cognome: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { codiceFiscale: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    });
  }
  if (searchEmail) {
    andFilters.push({
      email: { contains: searchEmail, mode: Prisma.QueryMode.insensitive },
    });
  }
  if (andFilters.length) {
    where.AND = andFilters;
  }

  if (hasCourses === "with") {
    where.registrations = { some: {} };
  }
  if (hasCourses === "without") {
    where.registrations = { none: {} };
  }

  const include: Prisma.EmployeeInclude = {
    _count: { select: { registrations: true, certificates: true } },
    client: { select: { id: true, ragioneSociale: true } },
  };

  const orderBySortOrder = sortOrder as Prisma.SortOrder;
  let orderBy: Prisma.EmployeeOrderByWithRelationInput = {
    createdAt: "desc",
  };
  if (sortBy === "cognome") {
    orderBy = { cognome: orderBySortOrder };
  } else if (sortBy === "nome") {
    orderBy = { nome: orderBySortOrder };
  } else if (sortBy === "coursesCount") {
    orderBy = { registrations: { _count: orderBySortOrder } };
  } else {
    orderBy = { createdAt: orderBySortOrder };
  }

  const [employees, total] = await prisma.$transaction([
    prisma.employee.findMany({
      where,
      include,
      orderBy,
      skip,
      take: safeLimit,
    }),
    prisma.employee.count({ where }),
  ]);

  const employeeIds = employees.map((employee) => employee.id);
  const completedRows = employeeIds.length
    ? await prisma.courseRegistration.groupBy({
        by: ["employeeId"],
        where: { employeeId: { in: employeeIds }, status: "TRAINED" },
        _count: { _all: true },
      })
    : [];

  const completedMap = new Map(
    completedRows.map((row) => [row.employeeId, row._count._all])
  );

  const data = employees.map((employee) => ({
    id: employee.id,
    clientId: employee.clientId,
    nome: employee.nome,
    cognome: employee.cognome,
    codiceFiscale: employee.codiceFiscale,
    dataNascita: employee.dataNascita,
    luogoNascita: employee.luogoNascita,
    email: employee.email,
    mansione: employee.mansione,
    note: employee.note,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    client: employee.client ?? undefined,
    _count: employee._count,
    coursesCompleted: completedMap.get(employee.id) ?? 0,
  }));

  return NextResponse.json({
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  });
}
