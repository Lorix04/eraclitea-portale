import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const registrations = await prisma.courseRegistration.findMany({
    where: { courseEditionId: context.params.id, clientId },
    include: { employee: true },
    orderBy: { insertedAt: "asc" },
  });

  return NextResponse.json({ data: registrations });
}
