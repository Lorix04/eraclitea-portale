import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItalianDate } from "@/lib/date-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { normalizeCodiceFiscale, validateEmail } from "@/lib/validators";

const TEMPLATE_HEADERS = [
  "nome",
  "cognome",
  "codice_fiscale",
  "sesso",
  "data_nascita",
  "comune_nascita",
  "email",
  "comune_residenza",
  "cap",
  "provincia",
  "regione",
  "indirizzo",
  "telefono",
  "cellulare",
  "mansione",
  "email_aziendale",
  "pec",
  "partita_iva",
  "iban",
  "note",
] as const;

const REQUIRED_FIELDS = [
  "nome",
  "cognome",
  "codice_fiscale",
  "sesso",
  "data_nascita",
  "comune_nascita",
  "email",
  "comune_residenza",
  "cap",
  "provincia",
  "regione",
] as const;

type TemplateHeader = (typeof TEMPLATE_HEADERS)[number];
type RowIssue = { row: number; reason: string };

// Maps Employee DB column name → template header key
const STANDARD_TO_TEMPLATE: Record<string, TemplateHeader> = {
  nome: "nome",
  cognome: "cognome",
  codiceFiscale: "codice_fiscale",
  sesso: "sesso",
  dataNascita: "data_nascita",
  luogoNascita: "comune_nascita",
  email: "email",
  comuneResidenza: "comune_residenza",
  cap: "cap",
  provincia: "provincia",
  regione: "regione",
  indirizzo: "indirizzo",
  telefono: "telefono",
  cellulare: "cellulare",
  mansione: "mansione",
  emailAziendale: "email_aziendale",
  pec: "pec",
  partitaIva: "partita_iva",
  iban: "iban",
  note: "note",
};

export const dynamic = "force-dynamic";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s*\*\s*$/, "")
    .toLowerCase();
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function getUploadedFile(formData: FormData): File | null {
  const fileValue = formData.get("file");
  if (fileValue instanceof File) return fileValue;

  for (const value of formData.values()) {
    if (value instanceof File) return value;
  }
  return null;
}

function detectFileType(file: File): "csv" | "excel" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";

  const mime = file.type.toLowerCase();
  if (mime.includes("csv") || mime.includes("text/plain")) return "csv";
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    mime.includes("excel")
  ) {
    return "excel";
  }

  return null;
}

async function parseRows(file: File, fileType: "csv" | "excel"): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook =
    fileType === "csv"
      ? XLSX.read(buffer.toString("utf8"), {
          type: "string",
          FS: ";",
          raw: false,
        })
      : XLSX.read(buffer, { type: "buffer", raw: false });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return rawRows.map((row) =>
    Array.isArray(row) ? row.map((cell) => normalizeCell(cell)) : []
  );
}

function buildRowObject(
  headerIndexMap: Map<string, number>,
  rowValues: string[]
): Record<TemplateHeader, string> {
  const row = {} as Record<TemplateHeader, string>;
  for (const header of TEMPLATE_HEADERS) {
    const columnIndex = headerIndexMap.get(header);
    row[header] = columnIndex === undefined ? "" : normalizeCell(rowValues[columnIndex]);
  }
  return row;
}

function parseBirthDateValue(value: string): Date | null {
  const normalized = value.trim();
  if (!normalized) return null;

  // Excel may store dates as serial numbers (e.g. 31048).
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const serial = Number(normalized);
    if (!Number.isFinite(serial) || serial <= 0) return null;
    const parsedSerial = XLSX.SSF.parse_date_code(serial);
    if (parsedSerial?.y && parsedSerial?.m && parsedSerial?.d) {
      return new Date(parsedSerial.y, parsedSerial.m - 1, parsedSerial.d);
    }
    return null;
  }

  return parseItalianDate(normalized);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = getUploadedFile(formData);
    if (!file) {
      return NextResponse.json(
        { error: "File mancante. Carica un file CSV o Excel." },
        { status: 400 }
      );
    }

    const fileType = detectFileType(file);
    if (!fileType) {
      return NextResponse.json(
        { error: "Formato file non supportato. Usa .csv, .xlsx o .xls." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId =
      searchParams.get("clientId")?.trim() || getFormString(formData, "clientId");
    const editionId =
      searchParams.get("editionId")?.trim() || getFormString(formData, "editionId");
    const importMode = getFormString(formData, "importMode") || "standard";

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId obbligatorio" },
        { status: 400 }
      );
    }

    if (session.user.role !== "ADMIN") {
      if (!session.user.clientId || session.user.clientId !== clientId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (editionId) {
      const edition = await prisma.courseEdition.findUnique({
        where: { id: editionId },
        select: { id: true, clientId: true },
      });

      if (!edition) {
        return NextResponse.json(
          { error: "Edizione non trovata" },
          { status: 404 }
        );
      }

      if (edition.clientId !== clientId) {
        return NextResponse.json(
          {
            error:
              "L'edizione indicata non appartiene al cliente selezionato",
          },
          { status: 400 }
        );
      }
    }

    const rows = await parseRows(file, fileType);
    if (!rows.length) {
      return NextResponse.json(
        { error: "Il file e vuoto o non contiene dati validi." },
        { status: 400 }
      );
    }

    // Check for explicit column mapping from preview step
    const columnMappingRaw = getFormString(formData, "columnMapping");
    let explicitMapping: Record<string, string> | null = null;
    if (columnMappingRaw) {
      try {
        explicitMapping = JSON.parse(columnMappingRaw);
      } catch {
        // ignore invalid JSON
      }
    }

    // Fetch custom fields for this client
    const customFieldDefs = await prisma.clientCustomField.findMany({
      where: { clientId, isActive: true },
      select: { name: true, label: true, columnHeader: true, standardField: true, required: true },
    });

    const rawHeaders = rows[0] ?? [];
    const normalizedHeaders = rawHeaders.map((header) => normalizeHeader(header));

    // Build column index maps
    const headerIndexMap = new Map<string, number>();
    const customColumnIndexMap = new Map<string, number>();

    if (explicitMapping) {
      // --- Explicit mapping from preview step ---
      const rawHeadersOriginal = rawHeaders.map((h) => String(h ?? "").trim());
      rawHeadersOriginal.forEach((original, index) => {
        if (!original) return;
        const target = explicitMapping![original];
        if (!target || target === "__skip__") return;

        if (target.startsWith("custom_")) {
          const cfName = target.replace("custom_", "");
          if (!customColumnIndexMap.has(cfName)) {
            customColumnIndexMap.set(cfName, index);
          }
        } else if (TEMPLATE_HEADERS.includes(target as TemplateHeader)) {
          if (!headerIndexMap.has(target)) {
            headerIndexMap.set(target, index);
          }
        }
      });
    } else {
      // --- Auto-mapping (backward compatible) ---
      const customHeaderMap = new Map<string, string>();
      const standardHeaderAliases = new Map<string, string>();
      for (const cf of customFieldDefs) {
        const headerLower = (cf.columnHeader || cf.label).toLowerCase().trim();
        const nameLower = cf.name.toLowerCase().trim();
        if (cf.standardField) {
          const stdTemplateKey = STANDARD_TO_TEMPLATE[cf.standardField];
          if (stdTemplateKey) {
            standardHeaderAliases.set(headerLower, stdTemplateKey);
            standardHeaderAliases.set(nameLower, stdTemplateKey);
          }
        } else {
          customHeaderMap.set(headerLower, cf.name);
          customHeaderMap.set(nameLower, cf.name);
          customHeaderMap.set(`custom_${nameLower}`, cf.name);
        }
      }

      normalizedHeaders.forEach((header, index) => {
        if (!header.length) return;
        const resolved = standardHeaderAliases.get(header) || header;
        if (TEMPLATE_HEADERS.includes(resolved as TemplateHeader)) {
          if (!headerIndexMap.has(resolved)) headerIndexMap.set(resolved, index);
        } else if (customHeaderMap.has(header)) {
          const fn = customHeaderMap.get(header)!;
          if (!customColumnIndexMap.has(fn)) customColumnIndexMap.set(fn, index);
        }
        if (header.startsWith("custom_") && !customHeaderMap.has(header)) {
          const stripped = header.replace("custom_", "");
          const match = customFieldDefs.find((cf) => cf.name.toLowerCase() === stripped && !cf.standardField);
          if (match && !customColumnIndexMap.has(match.name)) customColumnIndexMap.set(match.name, index);
        }
      });
    }

    // Validate: need at least codice_fiscale mapped
    if (!headerIndexMap.has("codice_fiscale")) {
      // Check if any REQUIRED_FIELDS are missing (for non-custom mode)
      const clientConfig = await prisma.client.findUnique({
        where: { id: clientId },
        select: { hasCustomFields: true },
      });
      const hasCustomFields = clientConfig?.hasCustomFields && customFieldDefs.length > 0;

      if (hasCustomFields) {
        return NextResponse.json(
          { success: false, error: "Il file deve contenere una colonna mappata al Codice Fiscale." },
          { status: 400 }
        );
      } else {
        const missingRequired = REQUIRED_FIELDS.filter((h) => !headerIndexMap.has(h));
        return NextResponse.json(
          { success: false, error: "Header non valido. Usa il template ufficiale.", details: { missingHeaders: missingRequired, expectedHeaders: TEMPLATE_HEADERS } },
          { status: 400 }
        );
      }
    }

    const existingEmployees = await prisma.employee.findMany({
      where: { clientId },
      select: { id: true, codiceFiscale: true },
    });
    const employeesByCodiceFiscale = new Map<string, string>();
    for (const emp of existingEmployees) {
      if (emp.codiceFiscale) {
        employeesByCodiceFiscale.set(normalizeCodiceFiscale(emp.codiceFiscale), emp.id);
      }
    }

    // Determine effective required fields
    const clientForReq = await prisma.client.findUnique({
      where: { id: clientId },
      select: { hasCustomFields: true },
    });
    const isCustomMode = importMode === "custom" && clientForReq?.hasCustomFields && customFieldDefs.length > 0;

    let effectiveStandardRequired: Set<TemplateHeader>;
    const requiredCustomFieldNames = new Set<string>();

    if (isCustomMode) {
      // Custom mode: ONLY fields marked required in client config — no defaults
      const reqSet = new Set<TemplateHeader>();
      for (const cf of customFieldDefs) {
        if (!cf.required) continue;
        if (cf.standardField) {
          const tmpl = STANDARD_TO_TEMPLATE[cf.standardField];
          if (tmpl) reqSet.add(tmpl);
        } else {
          requiredCustomFieldNames.add(cf.name);
        }
      }
      effectiveStandardRequired = reqSet;
    } else {
      effectiveStandardRequired = new Set(REQUIRED_FIELDS);
    }

    const skippedRows: RowIssue[] = [];
    const errorRows: RowIssue[] = [];
    let totalRows = 0;
    let imported = 0;

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const excelRowNumber = rowIndex + 1;
      const row = buildRowObject(headerIndexMap, rows[rowIndex] ?? []);
      const isCompletelyEmpty = TEMPLATE_HEADERS.every((header) => !row[header]);
      // Also check custom columns for emptiness
      const rowValues = rows[rowIndex] ?? [];
      const hasAnyCustom = [...customColumnIndexMap.values()].some(
        (idx) => normalizeCell(rowValues[idx]).length > 0
      );
      if (isCompletelyEmpty && !hasAnyCustom) {
        continue;
      }

      totalRows += 1;

      // Check required standard fields
      const missingField = [...effectiveStandardRequired].find(
        (field) => headerIndexMap.has(field) && !row[field]
      );
      if (missingField) {
        errorRows.push({
          row: excelRowNumber,
          reason: `Campo obbligatorio '${missingField}' mancante`,
        });
        continue;
      }

      // Check required custom fields
      let missingCustom: string | null = null;
      for (const cfName of requiredCustomFieldNames) {
        const colIdx = customColumnIndexMap.get(cfName);
        if (colIdx !== undefined && !normalizeCell(rowValues[colIdx])) {
          missingCustom = cfName;
          break;
        }
      }
      if (missingCustom) {
        errorRows.push({
          row: excelRowNumber,
          reason: `Campo obbligatorio '${missingCustom}' mancante`,
        });
        continue;
      }

      // Validate sesso only if present (or required)
      const sessoVal = row.sesso?.toUpperCase() || "";
      if (sessoVal && sessoVal !== "M" && sessoVal !== "F") {
        errorRows.push({
          row: excelRowNumber,
          reason: "Campo 'sesso' non valido. Usa M o F",
        });
        continue;
      }

      // Validate date only if present (or required)
      let parsedBirthDate: Date | null = null;
      if (row.data_nascita) {
        parsedBirthDate = parseBirthDateValue(row.data_nascita);
        if (!parsedBirthDate) {
          errorRows.push({
            row: excelRowNumber,
            reason: "Campo 'data_nascita' non valido. Usa il formato GG/MM/AAAA",
          });
          continue;
        }
      }

      // Validate email only if present
      if (row.email && !validateEmail(row.email)) {
        errorRows.push({
          row: excelRowNumber,
          reason: "Campo 'email' non valido",
        });
        continue;
      }

      const normalizedCF = row.codice_fiscale ? normalizeCodiceFiscale(row.codice_fiscale) : "";
      // Only check for duplicates if CF is present
      const existingEmployeeId = normalizedCF ? employeesByCodiceFiscale.get(normalizedCF) : undefined;
      if (existingEmployeeId) {
        if (!editionId) {
          skippedRows.push({
            row: excelRowNumber,
            reason: `Codice fiscale ${normalizedCF} gia esistente`,
          });
          continue;
        }

        const existingRegistration = await prisma.courseRegistration.findUnique({
          where: {
            courseEditionId_employeeId: {
              courseEditionId: editionId,
              employeeId: existingEmployeeId,
            },
          },
          select: { id: true },
        });

        if (existingRegistration) {
          skippedRows.push({
            row: excelRowNumber,
            reason: `Codice fiscale ${normalizedCF} gia registrato all'edizione`,
          });
          continue;
        }

        try {
          await prisma.courseRegistration.create({
            data: {
              clientId,
              courseEditionId: editionId,
              employeeId: existingEmployeeId,
              status: "INSERTED",
            },
          });
          imported += 1;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            skippedRows.push({
              row: excelRowNumber,
              reason: `Codice fiscale ${normalizedCF} gia registrato all'edizione`,
            });
            continue;
          }

          console.error("[EMPLOYEES_IMPORT_REGISTER] Error:", error);
          errorRows.push({
            row: excelRowNumber,
            reason: "Errore durante la registrazione all'edizione",
          });
        }
        continue;
      }

      // Extract custom field values from this row
      const customData: Record<string, string> = {};
      for (const [fieldName, colIdx] of customColumnIndexMap.entries()) {
        const val = normalizeCell(rowValues[colIdx]);
        if (val) customData[fieldName] = val;
      }
      const customDataValue = Object.keys(customData).length > 0 ? customData : undefined;

      try {
        let createdEmployeeId: string | null = null;
        await prisma.$transaction(async (tx) => {
          const createdEmployee = await tx.employee.create({
            data: {
              clientId,
              nome: row.nome || null,
              cognome: row.cognome || null,
              codiceFiscale: normalizedCF || null,
              sesso: sessoVal || null,
              dataNascita: parsedBirthDate,
              luogoNascita: row.comune_nascita || null,
              email: row.email || null,
              comuneResidenza: row.comune_residenza || null,
              cap: row.cap || null,
              provincia: row.provincia || null,
              regione: row.regione || null,
              indirizzo: row.indirizzo || null,
              telefono: row.telefono || null,
              cellulare: row.cellulare || null,
              mansione: row.mansione || null,
              emailAziendale: row.email_aziendale || null,
              pec: row.pec || null,
              partitaIva: row.partita_iva || null,
              iban: row.iban || null,
              note: row.note || null,
              ...(customDataValue ? { customData: customDataValue } : {}),
            },
          });
          createdEmployeeId = createdEmployee.id;

          if (editionId) {
            await tx.courseRegistration.create({
              data: {
                clientId,
                courseEditionId: editionId,
                employeeId: createdEmployee.id,
                status: "INSERTED",
              },
            });
          }
        });

        if (createdEmployeeId) {
          employeesByCodiceFiscale.set(normalizedCF, createdEmployeeId);
        }
        imported += 1;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          skippedRows.push({
            row: excelRowNumber,
            reason: `Codice fiscale ${normalizedCF} gia esistente`,
          });
          continue;
        }

        console.error("[EMPLOYEES_IMPORT_ROW] Error:", error);
        errorRows.push({
          row: excelRowNumber,
          reason: "Errore durante il salvataggio della riga",
        });
      }
    }

    await logAudit({
      userId: session.user.id,
      action: "EMPLOYEE_CREATE",
      entityType: "Employee",
      entityId: editionId || clientId,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      totalRows,
      imported,
      skipped: skippedRows.length,
      errors: errorRows.length,
      details: {
        skippedRows,
        errorRows,
      },
    });
  } catch (error) {
    console.error("[EMPLOYEES_IMPORT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
