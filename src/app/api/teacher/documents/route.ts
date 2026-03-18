import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session.user.teacherId;
}

export async function GET() {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        cvOriginalName: true,
        cvPath: true,
        idDocumentName: true,
        idDocumentPath: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const signedDocuments = await prisma.teacherSignedDocument.findMany({
      where: { teacherId },
      select: {
        id: true,
        documentType: true,
        declaration1: true,
        declaration2: true,
        declaration3: true,
        declaration4: true,
        declaration5: true,
        signedAt: true,
        pdfPath: true,
      },
    });

    return NextResponse.json({
      signedDocuments,
      cv: {
        fileName: teacher.cvOriginalName,
        hasFile: !!teacher.cvPath,
      },
      idDocument: {
        fileName: teacher.idDocumentName,
        hasFile: !!teacher.idDocumentPath,
      },
    });
  } catch (error) {
    console.error("[TEACHER_DOCUMENTS_GET] Error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
