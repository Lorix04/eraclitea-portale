import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { formatItalianDate } from "@/lib/date-utils";
import { Prisma } from "@prisma/client";

const querySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  searchEmail: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  hasCourses: z.enum(["all", "with", "without"]).optional(),
});

export async function GET(request: Request) {
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
    searchEmail,
    sortBy = "cognome",
    sortOrder = "asc",
    hasCourses = "all",
  } = validation.data;
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
  if (andFilters.length) {
    where.AND = andFilters;
  }

  if (hasCourses === "with") {
    where.registrations = { some: {} };
  }
  if (hasCourses === "without") {
    where.registrations = { none: {} };
  }

  const orderBySortOrder = sortOrder as Prisma.SortOrder;
  let orderBy: Prisma.EmployeeOrderByWithRelationInput = {
    cognome: "asc",
  };
  if (sortBy === "createdAt") {
    orderBy = { createdAt: orderBySortOrder };
  } else if (sortBy === "nome") {
    orderBy = { nome: orderBySortOrder };
  } else if (sortBy === "coursesCount") {
    orderBy = { registrations: { _count: orderBySortOrder } };
  } else {
    orderBy = { cognome: orderBySortOrder };
  }

  const employees = await prisma.employee.findMany({
    where,
    select: {
      cognome: true,
      nome: true,
      sesso: true,
      dataNascita: true,
      luogoNascita: true,
      indirizzo: true,
      regione: true,
      provincia: true,
      comuneResidenza: true,
      cap: true,
      codiceFiscale: true,
      mansione: true,
      telefono: true,
      cellulare: true,
      email: true,
      emailAziendale: true,
      partitaIva: true,
      iban: true,
      pec: true,
    },
    orderBy,
  });

  const toValue = (value: string | null | undefined) => value ?? "";
  const rows = employees.map((employee) => ({
    cognome: toValue(employee.cognome),
    nome: toValue(employee.nome),
    sesso: toValue(employee.sesso),
    nascita: formatItalianDate(employee.dataNascita),
    comune_nasc: toValue(employee.luogoNascita),
    indirizzo: toValue(employee.indirizzo),
    regione: toValue(employee.regione),
    provincia: toValue(employee.provincia),
    comune: toValue(employee.comuneResidenza),
    cap: toValue(employee.cap),
    cod_fiscale: toValue(employee.codiceFiscale),
    professione: toValue(employee.mansione),
    telefono: toValue(employee.telefono),
    cellulare: toValue(employee.cellulare),
    email: toValue(employee.email),
    email_aziendale: toValue(employee.emailAziendale),
    partita_IVA: toValue(employee.partitaIva),
    IBAN: toValue(employee.iban),
    ndipendenti: "",
    fondo_interprof: "",
    pec: toValue(employee.pec),
  }));

  const csv = stringify(rows, {
    header: true,
    delimiter: ";",
    record_delimiter: "\r\n",
    columns: [
      "cognome",
      "nome",
      "sesso",
      "nascita",
      "comune_nasc",
      "indirizzo",
      "regione",
      "provincia",
      "comune",
      "cap",
      "cod_fiscale",
      "professione",
      "telefono",
      "cellulare",
      "email",
      "email_aziendale",
      "partita_IVA",
      "IBAN",
      "ndipendenti",
      "fondo_interprof",
      "pec",
    ],
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dipendenti_${Date.now()}.csv"`,
    },
  });
}
