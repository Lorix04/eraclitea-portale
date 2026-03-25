import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const check = await requirePermission("ruoli", "assign");
  if (check instanceof NextResponse) return check;

  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      isActive: true,
      adminRole: { select: { id: true, name: true } },
    },
    orderBy: { email: "asc" },
  });

  return NextResponse.json({ data: users });
}
