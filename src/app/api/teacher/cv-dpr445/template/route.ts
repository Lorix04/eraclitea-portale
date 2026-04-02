import { NextResponse } from "next/server";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Try public/templates first, then storage/templates
  const candidates = [
    path.join(process.cwd(), "public", "templates", "cv_dpr445_template.pdf"),
    path.join(
      process.env.FILE_STORAGE_PATH || process.env.STORAGE_PATH || "storage",
      "templates",
      "cv_dpr445_template.pdf"
    ),
  ];

  for (const filePath of candidates) {
    try {
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="CV_DPR445_Template.pdf"',
        },
      });
    } catch {
      // try next candidate
    }
  }

  return NextResponse.json(
    { error: "Template PDF non disponibile" },
    { status: 404 }
  );
}
