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

export const dynamic = "force-dynamic";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
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

    const rawHeaders = rows[0] ?? [];
    const normalizedHeaders = rawHeaders.map((header) => normalizeHeader(header));
    const nonEmptyHeaders = normalizedHeaders.filter((header) => header.length > 0);

    const missingHeaders = TEMPLATE_HEADERS.filter(
      (header) => !nonEmptyHeaders.includes(header)
    );
    const unknownHeaders = nonEmptyHeaders.filter(
      (header) => !TEMPLATE_HEADERS.includes(header as TemplateHeader)
    );

    if (missingHeaders.length || unknownHeaders.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Header non valido. Usa il template ufficiale.",
          details: {
            missingHeaders,
            unknownHeaders,
            expectedHeaders: TEMPLATE_HEADERS,
          },
        },
        { status: 400 }
      );
    }

    const headerIndexMap = new Map<string, number>();
    normalizedHeaders.forEach((header, index) => {
      if (header.length && !headerIndexMap.has(header)) {
        headerIndexMap.set(header, index);
      }
    });

    const existingEmployees = await prisma.employee.findMany({
      where: { clientId },
      select: { id: true, codiceFiscale: true },
    });
    const employeesByCodiceFiscale = new Map<string, string>(
      existingEmployees.map((employee) => [
        normalizeCodiceFiscale(employee.codiceFiscale),
        employee.id,
      ])
    );

    const skippedRows: RowIssue[] = [];
    const errorRows: RowIssue[] = [];
    let totalRows = 0;
    let imported = 0;

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const excelRowNumber = rowIndex + 1;
      const row = buildRowObject(headerIndexMap, rows[rowIndex] ?? []);
      const isCompletelyEmpty = TEMPLATE_HEADERS.every((header) => !row[header]);
      if (isCompletelyEmpty) {
        continue;
      }

      totalRows += 1;

      const missingField = REQUIRED_FIELDS.find((field) => !row[field]);
      if (missingField) {
        errorRows.push({
          row: excelRowNumber,
          reason: `Campo obbligatorio '${missingField}' mancante`,
        });
        continue;
      }

      const sesso = row.sesso.toUpperCase();
      if (sesso !== "M" && sesso !== "F") {
        errorRows.push({
          row: excelRowNumber,
          reason: "Campo 'sesso' non valido. Usa M o F",
        });
        continue;
      }

      const parsedBirthDate = parseBirthDateValue(row.data_nascita);
      if (!parsedBirthDate) {
        errorRows.push({
          row: excelRowNumber,
          reason: "Campo 'data_nascita' non valido. Usa il formato GG/MM/AAAA",
        });
        continue;
      }

      if (!validateEmail(row.email)) {
        errorRows.push({
          row: excelRowNumber,
          reason: "Campo 'email' non valido",
        });
        continue;
      }

      const normalizedCF = normalizeCodiceFiscale(row.codice_fiscale);
      const existingEmployeeId = employeesByCodiceFiscale.get(normalizedCF);
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

      try {
        let createdEmployeeId: string | null = null;
        await prisma.$transaction(async (tx) => {
          const createdEmployee = await tx.employee.create({
            data: {
              clientId,
              nome: row.nome,
              cognome: row.cognome,
              codiceFiscale: normalizedCF,
              sesso,
              dataNascita: parsedBirthDate,
              luogoNascita: row.comune_nascita,
              email: row.email,
              comuneResidenza: row.comune_residenza,
              cap: row.cap,
              provincia: row.provincia,
              regione: row.regione,
              indirizzo: row.indirizzo || null,
              telefono: row.telefono || null,
              cellulare: row.cellulare || null,
              mansione: row.mansione || null,
              emailAziendale: row.email_aziendale || null,
              pec: row.pec || null,
              partitaIva: row.partita_iva || null,
              iban: row.iban || null,
              note: row.note || null,
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
