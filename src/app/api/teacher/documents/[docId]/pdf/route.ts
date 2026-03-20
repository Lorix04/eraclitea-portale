import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

const TEACHERS_STORAGE_DIR = path.resolve(configuredBase, "teachers");

export async function GET(
  _request: Request,
  context: { params: { docId: string } }
) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const doc = await prisma.teacherSignedDocument.findUnique({
      where: { id: context.params.docId },
      select: {
        id: true,
        pdfPath: true,
        pdfOriginalName: true,
        teacherId: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Documento non trovato" },
        { status: 404 }
      );
    }

    // Access check: the teacher (or admin impersonating) must own the document
    if (doc.teacherId !== teacherId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!doc.pdfPath) {
      return NextResponse.json(
        { error: "PDF non disponibile" },
        { status: 404 }
      );
    }

    // Resolve and validate path
    const normalized = doc.pdfPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const absolutePath = path.resolve(TEACHERS_STORAGE_DIR, normalized);

    if (!absolutePath.startsWith(TEACHERS_STORAGE_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = await fs.readFile(absolutePath);
    const fileName =
      doc.pdfOriginalName || `atto-notorieta-${doc.teacherId}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[TEACHER_DOC_PDF] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
