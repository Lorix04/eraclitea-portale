import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import * as XLSX from "xlsx";
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
  includeCustom: z.enum(["true", "false"]).optional(),
  fileFormat: z.enum(["csv", "xlsx"]).optional(),
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
      customData: true,
      clientId: true,
    },
    orderBy,
  });

  // Fetch custom fields if requested
  const includeCustom = validation.data.includeCustom === "true";
  let customFieldDefs: { name: string; label: string; columnHeader: string | null }[] = [];
  if (includeCustom && scopedClientId) {
    customFieldDefs = await prisma.clientCustomField.findMany({
      where: { clientId: scopedClientId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, label: true, columnHeader: true },
    });
  }

  const toValue = (value: string | null | undefined) => value ?? "";

  // Standard Employee field → custom field data key mapping
  const STANDARD_FIELD_TO_DATA: Record<string, (emp: any) => string> = {
    nome: (e) => toValue(e.nome),
    cognome: (e) => toValue(e.cognome),
    codiceFiscale: (e) => toValue(e.codiceFiscale),
    sesso: (e) => toValue(e.sesso),
    dataNascita: (e) => formatItalianDate(e.dataNascita),
    luogoNascita: (e) => toValue(e.luogoNascita),
    email: (e) => toValue(e.email),
    comuneResidenza: (e) => toValue(e.comuneResidenza),
    cap: (e) => toValue(e.cap),
    provincia: (e) => toValue(e.provincia),
    regione: (e) => toValue(e.regione),
    indirizzo: (e) => toValue(e.indirizzo),
    telefono: (e) => toValue(e.telefono),
    cellulare: (e) => toValue(e.cellulare),
    mansione: (e) => toValue(e.mansione),
    emailAziendale: (e) => toValue(e.emailAziendale),
    pec: (e) => toValue(e.pec),
    partitaIva: (e) => toValue(e.partitaIva),
    iban: (e) => toValue(e.iban),
    note: (e) => toValue(e.note),
  };

  let rows: Record<string, string>[];
  let allColumns: string[];

  if (includeCustom && customFieldDefs.length > 0) {
    // Custom format: ONLY custom field columns
    // Fetch full defs with standardField info
    const fullDefs = await prisma.clientCustomField.findMany({
      where: { clientId: scopedClientId!, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, label: true, columnHeader: true, standardField: true },
    });

    allColumns = fullDefs.map((cf) => cf.columnHeader || cf.label);

    rows = employees.map((employee) => {
      const row: Record<string, string> = {};
      const cd = (employee.customData as Record<string, any>) || {};
      for (const cf of fullDefs) {
        const header = cf.columnHeader || cf.label;
        if (cf.standardField && STANDARD_FIELD_TO_DATA[cf.standardField]) {
          row[header] = STANDARD_FIELD_TO_DATA[cf.standardField](employee);
        } else {
          row[header] = toValue(cd[cf.name]);
        }
      }
      return row;
    });
  } else {
    // Standard format: 21 fixed columns
    const standardColumns = [
      "cognome", "nome", "sesso", "nascita", "comune_nasc",
      "indirizzo", "regione", "provincia", "comune", "cap",
      "cod_fiscale", "professione", "telefono", "cellulare",
      "email", "email_aziendale", "partita_IVA", "IBAN",
      "ndipendenti", "fondo_interprof", "pec",
    ];
    allColumns = standardColumns;

    rows = employees.map((employee) => ({
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
  }

  const fileFormat = validation.data.fileFormat || "csv";
  const timestamp = Date.now();

  if (fileFormat === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: allColumns });
    worksheet["!cols"] = allColumns.map((h) => ({ wch: Math.max(String(h).length + 2, 15) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dipendenti");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dipendenti_${timestamp}.xlsx"`,
      },
    });
  }

  const csv = stringify(rows, {
    header: true,
    delimiter: ";",
    record_delimiter: "\r\n",
    columns: allColumns,
  });

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dipendenti_${timestamp}.csv"`,
    },
  });
}
