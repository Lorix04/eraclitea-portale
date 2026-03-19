import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { readMaterial } from "@/lib/material-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string; edId: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

    const clientId = isAdminView
      ? null
      : effectiveClient?.clientId ?? null;

    const isTeacher =
      session.user.role === "TEACHER" && !!session.user.teacherId;

    if (!isAdminView && !clientId && !isTeacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: { id: true, courseId: true, clientId: true },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }

    if (!isAdminView && !isTeacher && edition.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isTeacher) {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: session.user.teacherId!,
          lesson: { courseEditionId: edition.id },
        },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }
    }

    const material = await prisma.editionMaterial.findUnique({
      where: { id: context.params.materialId },
    });

    if (!material || material.courseEditionId !== edition.id) {
      return NextResponse.json(
        { error: "Materiale non trovato" },
        { status: 404 }
      );
    }

    // Teacher can download APPROVED materials + own materials
    if (
      isTeacher &&
      material.status !== "APPROVED" &&
      material.uploadedById !== session.user.id
    ) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { buffer } = await readMaterial(material.filePath);

    const encodedFileName = encodeURIComponent(material.fileName).replace(
      /%20/g,
      "+"
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": material.mimeType,
        "Content-Disposition": `attachment; filename="${material.fileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[MATERIAL_DOWNLOAD] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
