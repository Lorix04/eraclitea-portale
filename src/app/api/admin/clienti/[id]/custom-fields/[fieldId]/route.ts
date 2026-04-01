import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function PUT(
  request: Request,
  context: { params: { id: string; fieldId: string } }
) {
  const check = await requirePermission("clienti", "manage-custom-fields");
  if (check instanceof NextResponse) return check;

  const { fieldId } = context.params;
  const body = await request.json();

  const existing = await prisma.clientCustomField.findUnique({
    where: { id: fieldId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Campo non trovato" }, { status: 404 });
  }

  const data: any = {};
  if (body.label !== undefined) data.label = body.label.trim();
  if (body.type !== undefined) data.type = body.type;
  if (body.required !== undefined) data.required = body.required;
  if (body.placeholder !== undefined) data.placeholder = body.placeholder || null;
  if (body.options !== undefined) data.options = body.options || null;
  if (body.defaultValue !== undefined) data.defaultValue = body.defaultValue || null;
  if (body.columnHeader !== undefined) data.columnHeader = body.columnHeader || null;
  if (body.standardField !== undefined) data.standardField = body.standardField || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const field = await prisma.clientCustomField.update({
    where: { id: fieldId },
    data,
  });

  return NextResponse.json({ field });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; fieldId: string } }
) {
  const check = await requirePermission("clienti", "manage-custom-fields");
  if (check instanceof NextResponse) return check;

  const { id: clientId, fieldId } = context.params;

  const existing = await prisma.clientCustomField.findUnique({ where: { id: fieldId } });
  if (!existing) {
    return NextResponse.json({ success: true });
  }

  await prisma.clientCustomField.delete({ where: { id: fieldId } });

  // If no more fields, disable custom fields flag
  const remaining = await prisma.clientCustomField.count({ where: { clientId } });
  if (remaining === 0) {
    await prisma.client.update({
      where: { id: clientId },
      data: { hasCustomFields: false },
    });
  }

  return NextResponse.json({ success: true });
}
