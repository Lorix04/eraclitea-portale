import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { CV_SECTIONS, type CvSectionKey } from "@/lib/cv-schemas";

export const dynamic = "force-dynamic";

// Maps the JSON keys from Claude response to our section keys
const JSON_TO_SECTION: Record<string, CvSectionKey> = {
  workExperiences: "work-experience",
  educations: "education",
  languages: "languages",
  certifications: "certifications",
  skills: "skills",
  trainingCourses: "training-courses",
  teachingExperiences: "teaching-experience",
  publications: "publications",
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await request.json();
    const { data, replaceExisting = false } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const teacherId = ctx.teacherId;
    const counts: Record<string, number> = {};

    // Process each section
    for (const [jsonKey, sectionKey] of Object.entries(JSON_TO_SECTION)) {
      const entries = data[jsonKey];
      if (!Array.isArray(entries) || entries.length === 0) {
        counts[jsonKey] = 0;
        continue;
      }

      const config = CV_SECTIONS[sectionKey];
      const model = (prisma as any)[config.model];

      // Delete existing if replaceExisting
      if (replaceExisting) {
        await model.deleteMany({ where: { teacherId } });
      }

      // Get current max sortOrder
      const maxSort = await model.aggregate({
        where: { teacherId },
        _max: { sortOrder: true },
      });
      let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

      // Create entries
      let created = 0;
      for (const entry of entries) {
        try {
          // Convert date fields
          const processedEntry: any = { ...entry };
          for (const field of config.dateFields) {
            if (field in processedEntry) {
              processedEntry[field] = parseDate(processedEntry[field]);
            }
          }

          // Remove fields that aren't in the schema
          delete processedEntry.id;
          delete processedEntry.teacherId;
          delete processedEntry.createdAt;
          delete processedEntry.updatedAt;
          delete processedEntry.sortOrder;

          // Validate with schema (lenient — skip invalid entries)
          const parsed = config.schema.safeParse(processedEntry);
          if (!parsed.success) {
            console.warn(`[CV_IMPORT] Skipping invalid ${sectionKey} entry:`, parsed.error.errors[0]?.message);
            continue;
          }

          // Re-process dates on validated data
          const finalData: any = { ...parsed.data };
          for (const field of config.dateFields) {
            if (field in finalData) {
              finalData[field] = parseDate(finalData[field]);
            }
          }

          await model.create({
            data: {
              ...finalData,
              teacherId,
              sortOrder: nextSort++,
            },
          });
          created++;
        } catch (err) {
          console.warn(`[CV_IMPORT] Error creating ${sectionKey} entry:`, err);
        }
      }
      counts[jsonKey] = created;
    }

    const totalImported = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      counts,
      totalImported,
    });
  } catch (error) {
    console.error("[CV_IMPORT_CONFIRM] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
