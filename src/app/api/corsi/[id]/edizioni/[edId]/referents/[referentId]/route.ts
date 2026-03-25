import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  context: { params: { id: string; edId: string; referentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "edizioni", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const deleted = await prisma.editionReferent.deleteMany({
    where: {
      id: context.params.referentId,
      courseEditionId: context.params.edId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Referente non trovato" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
