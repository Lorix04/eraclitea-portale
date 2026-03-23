import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderedIds = body?.orderedIds;
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds richiesto" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.courseMaterial.updateMany({
        where: { id, courseId: context.params.id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
