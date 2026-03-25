import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("ruoli", "create");
  if (check instanceof NextResponse) return check;

  const source = await prisma.adminRole.findUnique({
    where: { id: context.params.id },
  });

  if (!source) {
    return NextResponse.json({ error: "Ruolo non trovato" }, { status: 404 });
  }

  // Find a unique name
  let newName = `${source.name} (copia)`;
  let counter = 2;
  while (await prisma.adminRole.findUnique({ where: { name: newName } })) {
    newName = `${source.name} (copia ${counter})`;
    counter++;
  }

  const role = await prisma.adminRole.create({
    data: {
      name: newName,
      description: source.description,
      permissions: source.permissions as any,
      isSystem: false,
      isDefault: false,
    },
  });

  return NextResponse.json({ data: role }, { status: 201 });
}
