import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteTeacherCv,
  readTeacherCv,
  saveTeacherCv,
} from "@/lib/teacher-cv-storage";

export const runtime = "nodejs";

const MAX_CV_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

function getContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

function sanitizeDownloadName(fileName: string) {
  return fileName.replace(/[^\w.\-() ]/g, "_");
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

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, cvPath: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("cv");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File CV mancante" }, { status: 400 });
    }

    const extension = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Formato CV non supportato. Usa PDF, DOC o DOCX." },
        { status: 400 }
      );
    }

    if (file.size > MAX_CV_SIZE) {
      return NextResponse.json(
        { error: "Il CV supera la dimensione massima di 10MB." },
        { status: 400 }
      );
    }

    const saved = await saveTeacherCv(file, teacher.id);

    if (teacher.cvPath && teacher.cvPath !== saved.relativePath) {
      await deleteTeacherCv(teacher.cvPath);
    }

    const updated = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        cvPath: saved.relativePath,
        cvOriginalName: file.name || null,
      },
      select: {
        id: true,
        cvPath: true,
        cvOriginalName: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[ADMIN_TEACHER_CV_POST] Error:", error);
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

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, cvPath: true, cvOriginalName: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }
    if (!teacher.cvPath) {
      return NextResponse.json({ error: "CV non presente" }, { status: 404 });
    }

    const { buffer } = await readTeacherCv(teacher.cvPath);
    const downloadName = sanitizeDownloadName(
      teacher.cvOriginalName || path.basename(teacher.cvPath)
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": getContentType(downloadName),
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch (error) {
    console.error("[ADMIN_TEACHER_CV_GET] Error:", error);
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

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, cvPath: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    if (teacher.cvPath) {
      await deleteTeacherCv(teacher.cvPath);
    }

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        cvPath: null,
        cvOriginalName: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_CV_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

