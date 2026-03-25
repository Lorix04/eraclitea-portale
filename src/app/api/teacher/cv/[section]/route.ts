import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { CV_SECTIONS, isValidCvSection } from "@/lib/cv-schemas";

export const dynamic = "force-dynamic";

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

export async function GET(
  _request: Request,
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
    const entries = await (prisma as any)[config.model].findMany({
      where: { teacherId: ctx.teacherId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[TEACHER_CV_SECTION_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = config.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dati non validi" },
        { status: 400 }
      );
    }

    // Get next sort order
    const maxSort = await (prisma as any)[config.model].aggregate({
      where: { teacherId: ctx.teacherId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const data = prepareDates(parsed.data, config.dateFields);

    const entry = await (prisma as any)[config.model].create({
      data: {
        ...data,
        teacherId: ctx.teacherId,
        sortOrder: nextSort,
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("[TEACHER_CV_SECTION_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
