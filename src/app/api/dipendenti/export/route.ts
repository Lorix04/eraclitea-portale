import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import { authOptions } from "@/lib/auth";
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
    _count: { select: { registrations: true } },
    client: { select: { id: true, ragioneSociale: true } },
  };

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
    include,
    orderBy,
  });

  const rows = employees.map((employee) => ({
    Nome: employee.nome,
    Cognome: employee.cognome,
    "Codice Fiscale": employee.codiceFiscale,
    Email: employee.email || "",
    "Data Nascita": formatItalianDate(employee.dataNascita),
    "Luogo Nascita": employee.luogoNascita || "",
    Mansione: employee.mansione || "",
    "Numero Corsi": employee._count?.registrations ?? 0,
    ...(isAdmin
      ? { Cliente: employee.client?.ragioneSociale || "" }
      : {}),
  }));

  const BOM = "\uFEFF";
  const csv =
    BOM +
    stringify(rows, {
      header: true,
      delimiter: ";",
    });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dipendenti_${Date.now()}.csv"`,
    },
  });
}
