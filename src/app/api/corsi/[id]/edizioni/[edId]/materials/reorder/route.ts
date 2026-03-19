import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

    const clientId = isAdminView
      ? null
      : effectiveClient?.clientId ?? null;

    if (!isAdminView && !clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: { id: true, courseId: true, clientId: true },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    if (!isAdminView && edition.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderedIds } = body as { orderedIds?: string[] };

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds obbligatorio" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.editionMaterial.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[MATERIALS_REORDER] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
