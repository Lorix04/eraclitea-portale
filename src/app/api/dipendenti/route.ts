import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { employeeSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";
import { normalizeCodiceFiscale } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  excludeEditionId: z.string().optional(),
  searchEmail: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  hasCourses: z.enum(["all", "with", "without"]).optional(),
  includeRegistrations: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
});

const createSchema = employeeSchema.extend({
  clientId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const effectiveClient = await getEffectiveClientContext();

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const {
    search,
    clientId,
    excludeEditionId,
    searchEmail,
    sortBy = "createdAt",
    sortOrder = "desc",
    hasCourses = "all",
    includeRegistrations,
    page,
    limit,
  } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const skip = (safePage - 1) * safeLimit;

  const isAdmin = session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;
  const scopedClientId = isAdmin
    ? clientId
    : effectiveClient?.clientId ?? session.user.clientId;

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
  if (hasCourses === "with") {
    andFilters.push({ registrations: { some: {} } });
  }
  if (hasCourses === "without") {
    andFilters.push({ registrations: { none: {} } });
  }
  if (excludeEditionId) {
    andFilters.push({
      registrations: { none: { courseEditionId: excludeEditionId } },
    });
  }
  if (andFilters.length) {
    where.AND = andFilters;
  }

  const include: Prisma.EmployeeInclude = {
    _count: { select: { registrations: true, certificates: true } },
    client: { select: { id: true, ragioneSociale: true } },
  };
  if (includeRegistrations === "true") {
    include.registrations = { select: { courseEditionId: true } };
  }

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
    sesso: employee.sesso,
    dataNascita: employee.dataNascita,
    luogoNascita: employee.luogoNascita,
    email: employee.email,
    telefono: employee.telefono,
    cellulare: employee.cellulare,
    indirizzo: employee.indirizzo,
    comuneResidenza: employee.comuneResidenza,
    cap: employee.cap,
    mansione: employee.mansione,
    note: employee.note,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    client: employee.client ?? undefined,
    _count: employee._count,
    coursesCompleted: completedMap.get(employee.id) ?? 0,
    registrations:
      includeRegistrations === "true"
        ? employee.registrations?.map((reg) => ({
            courseEditionId: reg.courseEditionId,
          }))
        : undefined,
  }));

    return NextResponse.json({
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  } catch (error) {
    console.error("[EMPLOYEES_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const validation = await validateBody(request, createSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const data = validation.data;
  const isAdmin = session.user.role === "ADMIN";
  const clientId = isAdmin ? data.clientId : session.user.clientId;

  if (!clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const normalizedCF = normalizeCodiceFiscale(data.codiceFiscale);
  const existing = await prisma.employee.findFirst({
    where: { clientId, codiceFiscale: normalizedCF },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Dipendente con questo codice fiscale gia presente" },
      { status: 409 }
    );
  }

  const parsedDataNascita =
    data.dataNascita instanceof Date
      ? data.dataNascita
      : typeof data.dataNascita === "string" && data.dataNascita
        ? new Date(data.dataNascita)
        : null;

  const created = await prisma.employee.create({
    data: {
      clientId,
      nome: data.nome,
      cognome: data.cognome,
      codiceFiscale: normalizedCF,
      sesso: data.sesso || null,
      dataNascita: parsedDataNascita,
      luogoNascita: data.luogoNascita || null,
      email: data.email || null,
      telefono: (data.telefono as string | null | undefined) || null,
      cellulare: (data.cellulare as string | null | undefined) || null,
      indirizzo: (data.indirizzo as string | null | undefined) || null,
      comuneResidenza:
        (data.comuneResidenza as string | null | undefined) || null,
      cap: (data.cap as string | null | undefined) || null,
      mansione: (data.mansione as string | null | undefined) || null,
      note: (data.note as string | null | undefined) || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "EMPLOYEE_CREATE",
    entityType: "Employee",
    entityId: created.id,
    ipAddress: getClientIP(request),
  });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYEES_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
