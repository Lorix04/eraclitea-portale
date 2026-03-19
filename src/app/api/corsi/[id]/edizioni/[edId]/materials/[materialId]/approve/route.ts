import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { id: string; edId: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      select: { id: true, courseId: true },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
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

    const body = await request.json();
    const { action, reason } = body as {
      action: "approve" | "reject";
      reason?: string;
    };

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Azione non valida" },
        { status: 400 }
      );
    }

    if (action === "reject" && (!reason || !reason.trim())) {
      return NextResponse.json(
        { error: "Motivazione obbligatoria per il rifiuto" },
        { status: 400 }
      );
    }

    const updatedMaterial = await prisma.editionMaterial.update({
      where: { id: context.params.materialId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        rejectionReason: action === "reject" ? reason!.trim() : null,
      },
    });

    // Send notification to the material uploader
    try {
      if (material.uploadedById) {
        const { createTeacherNotification } = await import(
          "@/lib/teacher-notifications"
        );
        if (action === "approve") {
          void createTeacherNotification({
            userId: material.uploadedById,
            type: "MATERIAL_APPROVED",
            title: "Materiale approvato",
            message: `Il materiale "${material.title}" è stato approvato`,
            courseEditionId: edition.id,
          });
        } else {
          void createTeacherNotification({
            userId: material.uploadedById,
            type: "MATERIAL_REJECTED",
            title: "Materiale rifiutato",
            message: `Il materiale "${material.title}" è stato rifiutato: ${reason!.trim()}`,
            courseEditionId: edition.id,
          });
        }
      }
    } catch {
      /* ignore notification errors */
    }

    return NextResponse.json({ data: updatedMaterial });
  } catch (error) {
    console.error("[MATERIAL_APPROVE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
