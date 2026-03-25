import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { CV_SECTIONS, isValidCvSection } from "@/lib/cv-schemas";

export async function PUT(
  request: Request,
  context: { params: { section: string } }
) {
  try {
    const section = context.params.section;
    if (!isValidCvSection(section)) {
      return NextResponse.json({ error: "Sezione non valida" }, { status: 400 });
    }

    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const config = CV_SECTIONS[section];
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds obbligatorio" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        (prisma as any)[config.model].updateMany({
          where: { id, teacherId: ctx.teacherId },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_CV_REORDER] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
