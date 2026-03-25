import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { CV_SECTIONS, isValidCvSection } from "@/lib/cv-schemas";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function prepareDates(data: any, dateFields: readonly string[]) {
  const result = { ...data };
  for (const field of dateFields) {
    if (field in result) {
      result[field] = parseDate(result[field]);
    }
  }
  return result;
}

export async function PUT(
  request: Request,
  context: { params: { section: string; id: string } }
) {
  try {
    const { section, id } = context.params;
    if (!isValidCvSection(section)) {
      return NextResponse.json({ error: "Sezione non valida" }, { status: 400 });
    }

    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const config = CV_SECTIONS[section];

    // Verify ownership
    const existing = await (prisma as any)[config.model].findFirst({
      where: { id, teacherId: ctx.teacherId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = config.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dati non validi" },
        { status: 400 }
      );
    }

    const data = prepareDates(parsed.data, config.dateFields);

    const updated = await (prisma as any)[config.model].update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[TEACHER_CV_ENTRY_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { section: string; id: string } }
) {
  try {
    const { section, id } = context.params;
    if (!isValidCvSection(section)) {
      return NextResponse.json({ error: "Sezione non valida" }, { status: 400 });
    }

    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const config = CV_SECTIONS[section];

    const deleted = await (prisma as any)[config.model].deleteMany({
      where: { id, teacherId: ctx.teacherId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_CV_ENTRY_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
