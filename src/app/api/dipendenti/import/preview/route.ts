import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCustomFieldsForEdition, getCustomFieldsForClient } from "@/lib/custom-field-resolver";

export const dynamic = "force-dynamic";

const TEMPLATE_HEADERS = [
  "nome", "cognome", "codice_fiscale", "sesso", "data_nascita",
  "comune_nascita", "email", "comune_residenza", "cap", "provincia",
  "regione", "indirizzo", "telefono", "cellulare", "mansione",
  "email_aziendale", "pec", "partita_iva", "iban", "note",
] as const;

const REQUIRED_FIELDS = [
  "nome", "cognome", "codice_fiscale", "sesso", "data_nascita",
  "comune_nascita", "email", "comune_residenza", "cap", "provincia", "regione",
] as const;

// Common aliases for standard fields
const HEADER_ALIASES: Record<string, string> = {
  nome: "nome",
  cognome: "cognome",
  codice_fiscale: "codice_fiscale",
  "codice fiscale": "codice_fiscale",
  cf: "codice_fiscale",
  sesso: "sesso",
  genere: "sesso",
  data_nascita: "data_nascita",
  "data nascita": "data_nascita",
  "data di nascita": "data_nascita",
  comune_nascita: "comune_nascita",
  "comune nascita": "comune_nascita",
  "comune di nascita": "comune_nascita",
  "luogo nascita": "comune_nascita",
  "luogo di nascita": "comune_nascita",
  email: "email",
  "e-mail": "email",
  "indirizzo mail": "email",
  "indirizzo email": "email",
  comune_residenza: "comune_residenza",
  "comune residenza": "comune_residenza",
  "comune di residenza": "comune_residenza",
  cap: "cap",
  provincia: "provincia",
  regione: "regione",
  indirizzo: "indirizzo",
  telefono: "telefono",
  cellulare: "cellulare",
  mansione: "mansione",
  email_aziendale: "email_aziendale",
  "email aziendale": "email_aziendale",
  pec: "pec",
  partita_iva: "partita_iva",
  "partita iva": "partita_iva",
  "p.iva": "partita_iva",
  iban: "iban",
  note: "note",
};

// Maps Employee DB column → template header
const STANDARD_TO_TEMPLATE: Record<string, string> = {
  nome: "nome", cognome: "cognome", codiceFiscale: "codice_fiscale",
  sesso: "sesso", dataNascita: "data_nascita", luogoNascita: "comune_nascita",
  email: "email", comuneResidenza: "comune_residenza", cap: "cap",
  provincia: "provincia", regione: "regione", indirizzo: "indirizzo",
  telefono: "telefono", cellulare: "cellulare", mansione: "mansione",
  emailAziendale: "email_aziendale", pec: "pec", partitaIva: "partita_iva",
  iban: "iban", note: "note",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().replace(/\s*\*\s*$/, "").toLowerCase();
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  const clientId = formData.get("clientId") as string;
  if (!clientId) {
    return NextResponse.json({ error: "clientId obbligatorio" }, { status: 400 });
  }

  // Parse file
  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook;
  try {
    workbook = fileName.endsWith(".csv")
      ? XLSX.read(buffer.toString("utf8"), { type: "string", FS: ";", raw: false })
      : XLSX.read(buffer, { type: "buffer", raw: false });
  } catch {
    return NextResponse.json({ error: "File non leggibile" }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "File vuoto" }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1, raw: false, defval: "",
  }) as string[][];

  if (rows.length < 2) {
    return NextResponse.json({ error: "Il file non contiene dati" }, { status: 400 });
  }

  const rawHeaders = (rows[0] || []).map((h) => String(h ?? "").trim());

  // Fetch custom fields — prefer edition-specific, fallback to client
  const previewEditionId = formData.get("editionId") as string | null;
  const cfResult = previewEditionId
    ? await getCustomFieldsForEdition(previewEditionId)
    : await getCustomFieldsForClient(clientId);
  const customFieldDefs = cfResult.fields;

  // Build custom header lookup
  const customLabelToField = new Map<string, { name: string; standardField: string | null }>();
  for (const cf of customFieldDefs) {
    const hdr = (cf.columnHeader || cf.label).toLowerCase().trim();
    customLabelToField.set(hdr, { name: cf.name, standardField: cf.standardField });
    customLabelToField.set(cf.name.toLowerCase().trim(), { name: cf.name, standardField: cf.standardField });
    if (!cf.standardField) {
      customLabelToField.set(`custom_${cf.name.toLowerCase().trim()}`, { name: cf.name, standardField: null });
    }
  }

  // Resolve each header
  const headers = rawHeaders.filter((h) => h.length > 0).map((original) => {
    const normalized = normalizeHeader(original);

    // 1. Direct match to standard alias
    const stdAlias = HEADER_ALIASES[normalized];
    if (stdAlias) {
      return { original, mapped: stdAlias, autoMapped: true };
    }

    // 2. Match to custom field config
    const cfMatch = customLabelToField.get(normalized);
    if (cfMatch) {
      if (cfMatch.standardField) {
        const stdKey = STANDARD_TO_TEMPLATE[cfMatch.standardField];
        if (stdKey) return { original, mapped: stdKey, autoMapped: true };
      }
      return { original, mapped: `custom_${cfMatch.name}`, autoMapped: true };
    }

    // 3. Handle custom_ prefix
    if (normalized.startsWith("custom_")) {
      const stripped = normalized.replace("custom_", "");
      const cfByName = customFieldDefs.find((cf) => cf.name.toLowerCase() === stripped && !cf.standardField);
      if (cfByName) {
        return { original, mapped: `custom_${cfByName.name}`, autoMapped: true };
      }
    }

    return { original, mapped: null, autoMapped: false };
  });

  // Preview rows (up to 3)
  const previewRows = rows.slice(1, 4).map((row) =>
    rawHeaders.map((_, idx) => normalizeCell((row as any)[idx]))
  );

  // Determine effective required fields based on client config
  const clientConfig = await prisma.client.findUnique({
    where: { id: clientId },
    select: { hasCustomFields: true },
  });

  let effectiveRequired: string[];
  if (clientConfig?.hasCustomFields && customFieldDefs.length > 0) {
    // Custom fields mode: ONLY fields marked required in client config
    effectiveRequired = customFieldDefs
      .filter((cf) => cf.required)
      .map((cf) => {
        if (cf.standardField) {
          return STANDARD_TO_TEMPLATE[cf.standardField] || cf.name;
        }
        return `custom_${cf.name}`;
      });
  } else {
    effectiveRequired = [...REQUIRED_FIELDS];
  }

  // Determine missing required from mapped headers
  const allMapped = new Set(
    headers.filter((h) => h.mapped).map((h) => h.mapped!)
  );
  const missingRequired = effectiveRequired.filter((f) => !allMapped.has(f));
  const unmappedHeaders = headers.filter((h) => !h.mapped).map((h) => h.original);

  return NextResponse.json({
    headers,
    previewRows,
    systemFields: [...TEMPLATE_HEADERS],
    customFields: customFieldDefs
      .filter((cf) => !cf.standardField)
      .map((cf) => ({ name: cf.name, label: cf.label, type: cf.type })),
    requiredFields: effectiveRequired,
    unmappedHeaders,
    missingRequired,
  });
}
