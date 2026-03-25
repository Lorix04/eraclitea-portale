import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: {
      id: true,
      email: true,
      adminRole: { select: { name: true } },
    },
    orderBy: { email: "asc" },
  });

  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      roleName: a.adminRole?.name ?? null,
    })),
  });
}
