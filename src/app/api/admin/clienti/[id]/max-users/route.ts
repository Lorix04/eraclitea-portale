import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "edit");
  if (check instanceof NextResponse) return check;

  let body: { maxUsers?: number | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const maxUsers =
    body.maxUsers === null || body.maxUsers === undefined
      ? null
      : Math.max(1, Math.round(body.maxUsers));

  await prisma.client.update({
    where: { id: context.params.id },
    data: { maxUsers },
  });

  return NextResponse.json({ success: true, maxUsers });
}
