import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { notifyEditionUsers, emailEditionUsers, buildCourseInfoBox, emailParagraph } from "@/lib/notify-client";

export async function POST(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "edizioni", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  let body: { motivo?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: {
      id: true,
      clientId: true,
      editionNumber: true,
      courseId: true,
      course: { select: { title: true } },
    },
  });

  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  // Reset confirmed registrations back to INSERTED
  const result = await prisma.courseRegistration.updateMany({
    where: {
      courseEditionId: edition.id,
      status: "CONFIRMED",
    },
    data: { status: "INSERTED" },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Nessuna anagrafica confermata da rifiutare" },
      { status: 400 }
    );
  }

  const motivo = body.motivo?.trim() || "";
  const portalUrl = process.env.NEXTAUTH_URL || "https://sapienta.it";

  // Notify all client users
  if (edition.clientId) {
    void notifyEditionUsers({
      editionId: edition.id,
      clientId: edition.clientId,
      type: "REGISTRY_REJECTED",
      title: "Anagrafiche da rivedere",
      message: `Le anagrafiche per ${edition.course.title} (Ed. #${edition.editionNumber}) richiedono modifiche.${motivo ? ` Motivo: ${motivo}` : ""}`,
      courseEditionId: edition.id,
    });

    void emailEditionUsers({
      editionId: edition.id,
      clientId: edition.clientId,
      emailType: "REGISTRY_REJECTED",
      subject: `Anagrafiche da correggere - ${edition.course.title} (Ed. #${edition.editionNumber})`,
      title: "Anagrafiche da Rivedere",
      bodyHtml: `
        ${emailParagraph("Le anagrafiche inviate richiedono delle modifiche:")}
        ${buildCourseInfoBox(edition.course.title, edition.editionNumber, motivo ? `<p style="margin:8px 0 0; font-size:14px; color:#1A1A1A;"><strong>Motivo:</strong> ${motivo}</p>` : "")}
        ${emailParagraph("Accedi al portale per correggere e re-inviare le anagrafiche.")}
      `,
      ctaText: "Correggi Anagrafiche",
      ctaUrl: `${portalUrl}/corsi/${edition.id}`,
      courseEditionId: edition.id,
    });
  }

  return NextResponse.json({ success: true, rejectedCount: result.count });
}
