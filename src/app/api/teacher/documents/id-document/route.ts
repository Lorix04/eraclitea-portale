import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { idDocumentPath: true, idDocumentName: true },
    });

    if (!teacher || !teacher.idDocumentPath) {
      return NextResponse.json({ error: "Documento d'identit\u00e0 non trovato" }, { status: 404 });
    }

    const teachersDir = path.resolve(configuredBase, "teachers");
    const normalized = teacher.idDocumentPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const absolutePath = path.resolve(teachersDir, normalized);

    // Path traversal check
    if (!absolutePath.startsWith(teachersDir)) {
      return NextResponse.json({ error: "Percorso non valido" }, { status: 400 });
    }

    const buffer = await fs.readFile(absolutePath);
    const contentType = getContentType(absolutePath);
    const fileName = teacher.idDocumentName || path.basename(absolutePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[TEACHER_DOCUMENTS_ID] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
