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
    provincia: employee.provincia,
    regione: employee.regione,
    emailAziendale: employee.emailAziendale,
    partitaIva: employee.partitaIva,
    iban: employee.iban,
    pec: employee.pec,
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

  const normalizedCF = data.codiceFiscale
    ? normalizeCodiceFiscale(data.codiceFiscale as string)
    : null;

  // Per-client toggle: persist Employee.customData?
  const clientCfg = await prisma.client.findUnique({
    where: { id: clientId },
    select: { saveEmployeeCustomData: true },
  });
  const persistCustomData = clientCfg?.saveEmployeeCustomData === true;

  const parsedDataNascita =
    data.dataNascita instanceof Date
      ? data.dataNascita
      : typeof data.dataNascita === "string" && data.dataNascita
        ? new Date(data.dataNascita)
        : null;

  const hasCustomDataIn =
    data.customData && Object.keys(data.customData).length > 0;

  // If a row with this CF already exists for this client, treat the manual
  // "Aggiungi dipendente" as a safe-merge update (no 409). Empty submitted
  // fields never overwrite existing values.
  if (normalizedCF) {
    const existing = await prisma.employee.findFirst({
      where: { clientId, codiceFiscale: normalizedCF },
      select: { id: true, customData: true },
    });
    if (existing) {
      const upd: Record<string, unknown> = {};
      const nome = (data.nome as string | null | undefined) ?? "";
      const cognome = (data.cognome as string | null | undefined) ?? "";
      const sesso = (data.sesso as string | null | undefined) ?? "";
      const luogoNascita = (data.luogoNascita as string | null | undefined) ?? "";
      const email = (data.email as string | null | undefined) ?? "";
      const telefono = (data.telefono as string | null | undefined) ?? "";
      const cellulare = (data.cellulare as string | null | undefined) ?? "";
      const indirizzo = (data.indirizzo as string | null | undefined) ?? "";
      const comuneResidenza =
        (data.comuneResidenza as string | null | undefined) ?? "";
      const cap = (data.cap as string | null | undefined) ?? "";
      const provincia = (data.provincia as string | null | undefined) ?? "";
      const regione = (data.regione as string | null | undefined) ?? "";
      const emailAziendale =
        (data.emailAziendale as string | null | undefined) ?? "";
      const pec = (data.pec as string | null | undefined) ?? "";
      const partitaIva = (data.partitaIva as string | null | undefined) ?? "";
      const iban = (data.iban as string | null | undefined) ?? "";
      const mansione = (data.mansione as string | null | undefined) ?? "";
      const note = (data.note as string | null | undefined) ?? "";

      if (nome) upd.nome = nome;
      if (cognome) upd.cognome = cognome;
      if (sesso) upd.sesso = sesso;
      if (parsedDataNascita) upd.dataNascita = parsedDataNascita;
      if (luogoNascita) upd.luogoNascita = luogoNascita;
      if (email) upd.email = email;
      if (telefono) upd.telefono = telefono;
      if (cellulare) upd.cellulare = cellulare;
      if (indirizzo) upd.indirizzo = indirizzo;
      if (comuneResidenza) upd.comuneResidenza = comuneResidenza;
      if (cap) upd.cap = cap;
      if (provincia) upd.provincia = provincia;
      if (regione) upd.regione = regione;
      if (emailAziendale) upd.emailAziendale = emailAziendale;
      if (pec) upd.pec = pec;
      if (partitaIva) upd.partitaIva = partitaIva;
      if (iban) upd.iban = iban;
      if (mansione) upd.mansione = mansione;
      if (note) upd.note = note;

      if (persistCustomData && hasCustomDataIn) {
        const prior =
          (existing.customData as Record<string, unknown> | null) ?? {};
        upd.customData = { ...prior, ...(data.customData as Record<string, unknown>) };
      }

      const updated =
        Object.keys(upd).length > 0
          ? await prisma.employee.update({
              where: { id: existing.id },
              data: upd,
            })
          : await prisma.employee.findUniqueOrThrow({
              where: { id: existing.id },
            });

      await logAudit({
        userId: session.user.id,
        action: "EMPLOYEE_UPDATE",
        entityType: "Employee",
        entityId: updated.id,
        ipAddress: getClientIP(request),
      });

      return NextResponse.json({ data: updated, merged: true });
    }
  }

  const customDataValue = persistCustomData && hasCustomDataIn
    ? (data.customData as Record<string, string>)
    : undefined;

  const created = await prisma.employee.create({
    data: {
      clientId,
      nome: (data.nome as string | null | undefined) || null,
      cognome: (data.cognome as string | null | undefined) || null,
      codiceFiscale: normalizedCF,
      sesso: (data.sesso as string | null | undefined) || null,
      dataNascita: parsedDataNascita,
      luogoNascita: (data.luogoNascita as string | null | undefined) || null,
      email: (data.email as string | null | undefined) || null,
      telefono: (data.telefono as string | null | undefined) || null,
      cellulare: (data.cellulare as string | null | undefined) || null,
      indirizzo: (data.indirizzo as string | null | undefined) || null,
      comuneResidenza:
        (data.comuneResidenza as string | null | undefined) || null,
      cap: (data.cap as string | null | undefined) || null,
      provincia: (data.provincia as string | null | undefined) || null,
      regione: (data.regione as string | null | undefined) || null,
      emailAziendale:
        (data.emailAziendale as string | null | undefined) || null,
      pec: (data.pec as string | null | undefined) || null,
      partitaIva: (data.partitaIva as string | null | undefined) || null,
      iban: (data.iban as string | null | undefined) || null,
      mansione: (data.mansione as string | null | undefined) || null,
      note: (data.note as string | null | undefined) || null,
      ...(customDataValue !== undefined ? { customData: customDataValue } : {}),
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
