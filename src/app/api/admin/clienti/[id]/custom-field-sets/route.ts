import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sets = await prisma.customFieldSet.findMany({
    where: { clientId: context.params.id },
    include: {
      fields: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { editions: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: sets });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "clienti", "manage-custom-fields")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  let body: {
    name?: string;
    isDefault?: boolean;
    fields?: Array<{
      name: string;
      label: string;
      type?: string;
      required?: boolean;
      options?: string;
      standardField?: string;
      columnHeader?: string;
    }>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome template richiesto" }, { status: 400 });
  }

  if (!body.fields || body.fields.length === 0) {
    return NextResponse.json({ error: "Almeno un campo richiesto" }, { status: 400 });
  }

  const clientId = context.params.id;

  // Check template name uniqueness
  const existing = await prisma.customFieldSet.findFirst({
    where: { clientId, name },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Un template con nome "${name}" esiste gia` },
      { status: 409 }
    );
  }

  // Deduplicate field names within the set
  const seenNames = new Set<string>();
  const dedupedFields = body.fields.filter((f) => {
    const key = (f.standardField || f.name).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  // If setting as default, remove default from others
  if (body.isDefault) {
    await prisma.customFieldSet.updateMany({
      where: { clientId, isDefault: true },
      data: { isDefault: false },
    });
  }

  let set;
  try {
    set = await prisma.customFieldSet.create({
      data: {
        clientId,
        name,
        isDefault: body.isDefault ?? false,
        fields: {
          create: dedupedFields.map((f, i) => ({
            clientId,
            name: (f.standardField || f.name).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
            label: f.label,
            type: f.type || "text",
            required: f.required ?? false,
            options: f.options || null,
            standardField: f.standardField || null,
            columnHeader: f.columnHeader || null,
            sortOrder: i,
          })),
        },
      },
      include: { fields: true },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const target = (err?.meta?.target as string[]) || [];
      if (target.includes("name") && target.includes("customFieldSetId")) {
        return NextResponse.json(
          { error: "Due campi non possono avere lo stesso nome nello stesso template" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Esiste gia un template con nome "${name}". Scegli un nome diverso.` },
        { status: 409 }
      );
    }
    throw err;
  }

  // Auto-enable hasCustomFields
  await prisma.client.update({
    where: { id: clientId },
    data: { hasCustomFields: true },
  });

  return NextResponse.json({ data: set }, { status: 201 });
}
