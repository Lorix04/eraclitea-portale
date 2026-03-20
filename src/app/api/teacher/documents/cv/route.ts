import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { readTeacherCv } from "@/lib/teacher-cv-storage";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { cvPath: true, cvOriginalName: true },
    });

    if (!teacher || !teacher.cvPath) {
      return NextResponse.json({ error: "CV non trovato" }, { status: 404 });
    }

    const { absolutePath, buffer } = await readTeacherCv(teacher.cvPath);
    const contentType = getContentType(absolutePath);
    const fileName = teacher.cvOriginalName || path.basename(absolutePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[TEACHER_DOCUMENTS_CV] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
