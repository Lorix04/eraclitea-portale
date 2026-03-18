import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveTeacherCv } from "@/lib/teacher-cv-storage";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_ID_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

async function validateToken(token: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true, userId: true },
  });

  if (!teacher) return null;
  if (teacher.userId) return null;
  if (
    teacher.inviteTokenExpiry &&
    new Date() > new Date(teacher.inviteTokenExpiry)
  ) {
    return null;
  }

  return teacher;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const token = formData.get("token") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !token || !type) {
      return NextResponse.json(
        { error: "File, token e tipo sono obbligatori" },
        { status: 400 }
      );
    }

    if (type !== "cv" && type !== "idDocument") {
      return NextResponse.json(
        { error: "Tipo non valido. Usa 'cv' o 'idDocument'" },
        { status: 400 }
      );
    }

    const teacher = await validateToken(token);
    if (!teacher) {
      return NextResponse.json(
        { error: "Token non valido o scaduto" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Il file supera la dimensione massima di 10MB" },
        { status: 400 }
      );
    }

    const allowedTypes = type === "cv" ? ALLOWED_CV_TYPES : ALLOWED_ID_TYPES;
    if (!allowedTypes.includes(file.type)) {
      const formats =
        type === "cv" ? "PDF, DOC, DOCX" : "PDF, JPG, PNG";
      return NextResponse.json(
        { error: `Formato non supportato. Formati accettati: ${formats}` },
        { status: 400 }
      );
    }

    if (type === "cv") {
      const result = await saveTeacherCv(file, teacher.id);
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          cvPath: result.relativePath,
          cvOriginalName: file.name,
        },
      });

      return NextResponse.json({
        success: true,
        fileName: file.name,
      });
    }

    // ID document upload
    const configuredBase = process.env.STORAGE_PATH
      ? path.resolve(process.env.STORAGE_PATH)
      : process.env.FILE_STORAGE_PATH
        ? path.resolve(process.env.FILE_STORAGE_PATH)
        : path.resolve("storage");

    const dir = path.resolve(configuredBase, "teachers", sanitizeFileName(teacher.id));
    await fs.mkdir(dir, { recursive: true });

    const safeName = sanitizeFileName(path.basename(file.name || "id_document"));
    const fileName = `${Date.now()}_id_${safeName}`;
    const absolutePath = path.resolve(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    const relativePath = path
      .relative(path.resolve(configuredBase, "teachers"), absolutePath)
      .replace(/\\/g, "/");

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        idDocumentPath: relativePath,
        idDocumentName: file.name,
      },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
    });
  } catch (error) {
    console.error("[TEACHER_REGISTER_UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Errore durante il caricamento del file" },
      { status: 500 }
    );
  }
}
