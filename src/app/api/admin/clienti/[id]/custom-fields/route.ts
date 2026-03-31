import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

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

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "view");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { hasCustomFields: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const fields = await prisma.clientCustomField.findMany({
    where: { clientId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    enabled: client.hasCustomFields,
    fields,
  });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "edit");
  if (check instanceof NextResponse) return check;

  const clientId = context.params.id;
  const body = await request.json();
  const { label, type, required, placeholder, options, defaultValue, columnHeader, standardField } = body;

  if (!label || !label.trim()) {
    return NextResponse.json({ error: "Nome campo obbligatorio" }, { status: 400 });
  }

  const validTypes = ["text", "number", "date", "select", "email"];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  }

  if (type === "select" && (!options || !options.trim())) {
    return NextResponse.json(
      { error: "Le opzioni sono obbligatorie per il tipo Selezione" },
      { status: 400 }
    );
  }

  const name = standardField
    ? standardField
    : body.name?.trim()
      ? slugify(body.name.trim())
      : slugify(label.trim());

  // Check uniqueness
  const existing = await prisma.clientCustomField.findUnique({
    where: { clientId_name: { clientId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Esiste gia un campo con il nome "${name}"` },
      { status: 409 }
    );
  }

  // Get next sort order
  const maxSort = await prisma.clientCustomField.aggregate({
    where: { clientId },
    _max: { sortOrder: true },
  });

  const field = await prisma.clientCustomField.create({
    data: {
      clientId,
      name,
      label: label.trim(),
      type: type || "text",
      required: required ?? false,
      placeholder: placeholder || null,
      options: options || null,
      defaultValue: defaultValue || null,
      columnHeader: columnHeader || null,
      standardField: standardField || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  // Enable custom fields on client
  await prisma.client.update({
    where: { id: clientId },
    data: { hasCustomFields: true },
  });

  return NextResponse.json({ field }, { status: 201 });
}
