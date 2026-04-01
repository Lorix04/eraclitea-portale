import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { STANDARD_EMPLOYEE_FIELDS } from "@/lib/standard-fields";

// Map of common header variations to standard field keys
const HEADER_TO_STANDARD: Record<string, string> = {};
for (const f of STANDARD_EMPLOYEE_FIELDS) {
  HEADER_TO_STANDARD[f.key.toLowerCase()] = f.key;
  HEADER_TO_STANDARD[f.label.toLowerCase()] = f.key;
}
// Additional common aliases
Object.assign(HEADER_TO_STANDARD, {
  cf: "codiceFiscale",
  "codice fiscale": "codiceFiscale",
  codice_fiscale: "codiceFiscale",
  "codice fiscale ": "codiceFiscale",
  genere: "sesso",
  "data nascita": "dataNascita",
  "data di nascita": "dataNascita",
  data_nascita: "dataNascita",
  "luogo nascita": "luogoNascita",
  "luogo di nascita": "luogoNascita",
  "comune nascita": "luogoNascita",
  "comune di nascita": "luogoNascita",
  comune_nascita: "luogoNascita",
  "e-mail": "email",
  "indirizzo mail": "email",
  "indirizzo email": "email",
  "comune residenza": "comuneResidenza",
  "comune di residenza": "comuneResidenza",
  comune_residenza: "comuneResidenza",
  "email aziendale": "emailAziendale",
  email_aziendale: "emailAziendale",
  "partita iva": "partitaIva",
  partita_iva: "partitaIva",
  "p.iva": "partitaIva",
  "p. iva": "partitaIva",
});

// Headers to always ignore (not meaningful columns)
const IGNORE_HEADERS = new Set(["id", "n.", "n", "#", "numero", "riga", ""]);

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "manage-custom-fields");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;
  const formData = await request.formData();

  // ---- Confirm mode: create selected fields ----
  const confirmCreate = formData.get("confirm") === "true";
  if (confirmCreate) {
    const selectedRaw = formData.get("selected");
    const items: { header: string; standardField: string | null }[] = selectedRaw
      ? JSON.parse(selectedRaw as string)
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Nessun campo selezionato" }, { status: 400 });
    }

    const existingFields = await prisma.clientCustomField.findMany({
      where: { clientId },
      select: { name: true, standardField: true },
    });
    const existingNames = new Set(existingFields.map((f) => f.name));
    const existingStandard = new Set(
      existingFields.filter((f) => f.standardField).map((f) => f.standardField!)
    );

    const maxSort = await prisma.clientCustomField.aggregate({
      where: { clientId },
      _max: { sortOrder: true },
    });
    let nextSort = (maxSort._max.sortOrder ?? -1) + 1;
    let created = 0;

    for (const item of items) {
      const sf = item.standardField;
      const name = sf || slugify(item.header);
      if (!name || existingNames.has(name)) continue;
      if (sf && existingStandard.has(sf)) continue;

      const stdDef = sf
        ? STANDARD_EMPLOYEE_FIELDS.find((f) => f.key === sf)
        : null;

      try {
        await prisma.clientCustomField.create({
          data: {
            clientId,
            name,
            label: item.header,
            type: stdDef?.type || "text",
            required: false,
            columnHeader: item.header,
            standardField: sf || null,
            sortOrder: nextSort++,
          },
        });
        existingNames.add(name);
        if (sf) existingStandard.add(sf);
        created++;
      } catch {
        // skip duplicates
      }
    }

    if (created > 0) {
      await prisma.client.update({
        where: { id: clientId },
        data: { hasCustomFields: true },
      });
    }

    return NextResponse.json({ success: true, created });
  }

  // ---- Preview mode: analyze uploaded file ----
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (
    !fileName.endsWith(".xlsx") &&
    !fileName.endsWith(".xls") &&
    !fileName.endsWith(".csv")
  ) {
    return NextResponse.json(
      { error: "Formato non supportato. Usa .xlsx, .xls o .csv" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = fileName.endsWith(".csv")
    ? XLSX.read(buffer.toString("utf8"), { type: "string", FS: ";", raw: false })
    : XLSX.read(buffer, { type: "buffer", raw: false });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "File vuoto" }, { status: 400 });
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!rows.length) {
    return NextResponse.json({ error: "File vuoto" }, { status: 400 });
  }

  const headerRow = rows[0] as string[];
  const headers = headerRow
    .map((h) => String(h ?? "").trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) {
    return NextResponse.json({ error: "Nessun header trovato" }, { status: 400 });
  }

  // Get existing fields
  const existingFields = await prisma.clientCustomField.findMany({
    where: { clientId },
    select: { name: true, label: true, standardField: true },
  });
  const existingNames = new Set(existingFields.map((f) => f.name));
  const existingLabels = new Set(existingFields.map((f) => f.label.toLowerCase()));
  const existingStandard = new Set(
    existingFields.filter((f) => f.standardField).map((f) => f.standardField!)
  );

  // Classify each header
  type FieldPreview = {
    header: string;
    standardField: string | null; // mapped standard field key, or null if custom
    standardLabel: string | null; // standard field Italian label
    status: "new" | "exists" | "ignored";
  };

  const fields: FieldPreview[] = [];
  const alreadyExists: string[] = [];
  const ignored: string[] = [];

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();

    if (IGNORE_HEADERS.has(normalized)) {
      ignored.push(header);
      continue;
    }

    const slug = slugify(header);
    if (!slug || slug.length < 1) {
      ignored.push(header);
      continue;
    }

    // Check if already configured
    if (existingNames.has(slug) || existingLabels.has(normalized)) {
      alreadyExists.push(header);
      continue;
    }

    // Check if it maps to a standard field
    const stdKey = HEADER_TO_STANDARD[normalized];
    if (stdKey && existingStandard.has(stdKey)) {
      alreadyExists.push(header);
      continue;
    }

    const stdDef = stdKey
      ? STANDARD_EMPLOYEE_FIELDS.find((f) => f.key === stdKey)
      : null;

    fields.push({
      header,
      standardField: stdKey || null,
      standardLabel: stdDef?.label || null,
      status: "new",
    });
  }

  return NextResponse.json({
    fileName: file.name,
    totalHeaders: headers.length,
    fields,
    alreadyExists,
    ignored,
  });
}
