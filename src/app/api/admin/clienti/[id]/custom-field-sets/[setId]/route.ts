import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: { id: string; setId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "clienti", "manage-custom-fields")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const set = await prisma.customFieldSet.findUnique({
    where: { id: context.params.setId },
  });
  if (!set || set.clientId !== context.params.id) {
    return NextResponse.json({ error: "Template non trovato" }, { status: 404 });
  }

  let body: {
    name?: string;
    isDefault?: boolean;
    fields?: Array<{
      id?: string;
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

  const clientId = context.params.id;

  // Check name uniqueness (if changed)
  if (body.name && body.name.trim() !== set.name) {
    const existing = await prisma.customFieldSet.findUnique({
      where: { clientId_name: { clientId, name: body.name.trim() } },
    });
    if (existing) {
      return NextResponse.json({ error: `Nome "${body.name}" gia in uso` }, { status: 409 });
    }
  }

  // If setting as default, unset others
  if (body.isDefault && !set.isDefault) {
    await prisma.customFieldSet.updateMany({
      where: { clientId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Update set
  await prisma.customFieldSet.update({
    where: { id: set.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
    },
  });

  // Update fields if provided
  if (body.fields) {
    // Deactivate all existing fields
    await prisma.clientCustomField.updateMany({
      where: { customFieldSetId: set.id },
      data: { isActive: false },
    });

    // Upsert provided fields
    for (let i = 0; i < body.fields.length; i++) {
      const f = body.fields[i];
      const fieldName = f.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      if (f.id) {
        await prisma.clientCustomField.update({
          where: { id: f.id },
          data: {
            label: f.label,
            type: f.type || "text",
            required: f.required ?? false,
            options: f.options || null,
            standardField: f.standardField || null,
            columnHeader: f.columnHeader || null,
            sortOrder: i,
            isActive: true,
          },
        });
      } else {
        await prisma.clientCustomField.create({
          data: {
            clientId,
            customFieldSetId: set.id,
            name: fieldName,
            label: f.label,
            type: f.type || "text",
            required: f.required ?? false,
            options: f.options || null,
            standardField: f.standardField || null,
            columnHeader: f.columnHeader || null,
            sortOrder: i,
          },
        });
      }
    }
  }

  const updated = await prisma.customFieldSet.findUnique({
    where: { id: set.id },
    include: { fields: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; setId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "clienti", "manage-custom-fields")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const set = await prisma.customFieldSet.findUnique({
    where: { id: context.params.setId },
    include: { _count: { select: { editions: true } } },
  });
  if (!set || set.clientId !== context.params.id) {
    return NextResponse.json({ error: "Template non trovato" }, { status: 404 });
  }

  if (set._count.editions > 0) {
    return NextResponse.json(
      { error: `Questo template e usato da ${set._count.editions} edizioni e non puo essere eliminato` },
      { status: 409 }
    );
  }

  // Hard delete: cascade removes child ClientCustomField records via onDelete: Cascade
  try {
    await prisma.customFieldSet.delete({ where: { id: set.id } });
  } catch (err: any) {
    if (err?.code === "P2003") {
      // FK constraint — likely editions still reference this set
      return NextResponse.json(
        { error: "Impossibile eliminare: il template e ancora referenziato da edizioni o campi." },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
