import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateFileContent } from "@/lib/security";
import { saveTeacherCv } from "@/lib/teacher-cv-storage";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const CV_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ID_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

export async function POST(request: Request) {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File mancante" }, { status: 400 });
    }

    if (!type || !["cv", "idDocument"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo non valido. Deve essere 'cv' o 'idDocument'" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Il file supera la dimensione massima di 10MB" },
        { status: 400 }
      );
    }

    if (type === "cv") {
      if (!CV_ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Tipo di file non valido. Formati accettati: PDF, DOC, DOCX" },
          { status: 400 }
        );
      }

      const cvContentValid = await validateFileContent(file, file.type);
      if (!cvContentValid) {
        return NextResponse.json(
          { error: "Il contenuto del file non corrisponde al tipo dichiarato" },
          { status: 400 }
        );
      }

      const result = await saveTeacherCv(file, teacherId);

      await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          cvPath: result.relativePath,
          cvOriginalName: file.name,
        },
      });

      return NextResponse.json({ success: true, fileName: file.name });
    }

    // idDocument
    if (!ID_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo di file non valido. Formati accettati: PDF, JPG, PNG" },
        { status: 400 }
      );
    }

    const idContentValid = await validateFileContent(file, file.type);
    if (!idContentValid) {
      return NextResponse.json(
        { error: "Il contenuto del file non corrisponde al tipo dichiarato" },
        { status: 400 }
      );
    }

    const safeTeacherId = teacherId.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dir = path.resolve(configuredBase, "teachers", safeTeacherId);
    await fs.mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_id_${safeName}`;
    const absolutePath = path.resolve(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    const teachersDir = path.resolve(configuredBase, "teachers");
    const relativePath = path.relative(teachersDir, absolutePath).replace(/\\/g, "/");

    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        idDocumentPath: relativePath,
        idDocumentName: file.name,
      },
    });

    return NextResponse.json({ success: true, fileName: file.name });
  } catch (error) {
    console.error("[TEACHER_DOCUMENTS_UPLOAD] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
