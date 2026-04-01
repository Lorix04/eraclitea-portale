import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "manage-custom-fields");
  if (check instanceof NextResponse) return check;

  const body = await request.json();
  const { enabled } = body;

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled obbligatorio" }, { status: 400 });
  }

  await prisma.client.update({
    where: { id: context.params.id },
    data: { hasCustomFields: enabled },
  });

  return NextResponse.json({ success: true });
}
