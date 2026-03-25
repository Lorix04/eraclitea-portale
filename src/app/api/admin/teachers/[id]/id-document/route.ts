import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateFileContent } from "@/lib/security";
import { checkApiPermission } from "@/lib/permissions";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

const TEACHERS_STORAGE_DIR = path.resolve(configuredBase, "teachers");

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, idDocumentPath: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File documento mancante" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato non supportato. Usa PDF, JPEG o PNG." },
        { status: 400 }
      );
    }

    const contentValid = await validateFileContent(file, file.type);
    if (!contentValid) {
      return NextResponse.json(
        { error: "Il contenuto del file non corrisponde al tipo dichiarato" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Il file supera la dimensione massima di 10MB." },
        { status: 400 }
      );
    }

    // Build safe storage path
    const safeTeacherId = sanitizeFileName(teacher.id);
    const dir = path.resolve(TEACHERS_STORAGE_DIR, safeTeacherId);
    await fs.mkdir(dir, { recursive: true });

    const safeName = sanitizeFileName(path.basename(file.name || "id_document"));
    const fileName = `${Date.now()}_id_${safeName}`;
    const absolutePath = path.resolve(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    const relativePath = path
      .relative(TEACHERS_STORAGE_DIR, absolutePath)
      .replace(/\\/g, "/");

    // Delete old file if it exists and path changed
    if (teacher.idDocumentPath && teacher.idDocumentPath !== relativePath) {
      const oldAbsolute = path.resolve(
        TEACHERS_STORAGE_DIR,
        teacher.idDocumentPath
      );
      if (oldAbsolute.startsWith(TEACHERS_STORAGE_DIR)) {
        await fs.unlink(oldAbsolute).catch(() => {});
      }
    }

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        idDocumentPath: relativePath,
        idDocumentName: file.name || null,
      },
    });

    return NextResponse.json({ success: true, fileName: file.name });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ID_DOCUMENT_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "view")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, idDocumentPath: true, idDocumentName: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (!teacher.idDocumentPath) {
      return NextResponse.json(
        { error: "Documento di identità non presente" },
        { status: 404 }
      );
    }

    const normalized = teacher.idDocumentPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    const absolutePath = path.resolve(TEACHERS_STORAGE_DIR, normalized);

    if (!absolutePath.startsWith(TEACHERS_STORAGE_DIR)) {
      return NextResponse.json(
        { error: "Percorso file non valido" },
        { status: 400 }
      );
    }

    const buffer = await fs.readFile(absolutePath);
    const displayName =
      teacher.idDocumentName || path.basename(teacher.idDocumentPath);

    return new Response(buffer, {
      headers: {
        "Content-Type": getContentType(displayName),
        "Content-Disposition": `inline; filename="${displayName}"`,
      },
    });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ID_DOCUMENT_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, idDocumentPath: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (teacher.idDocumentPath) {
      const normalized = teacher.idDocumentPath
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      const absolutePath = path.resolve(TEACHERS_STORAGE_DIR, normalized);

      if (absolutePath.startsWith(TEACHERS_STORAGE_DIR)) {
        await fs.unlink(absolutePath).catch(() => {});
      }
    }

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        idDocumentPath: null,
        idDocumentName: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_ID_DOCUMENT_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
