import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { courseEditionUpdateSchema } from "@/lib/schemas";
import { deleteCertificateFile } from "@/lib/certificate-storage";
import { formatDate } from "@/lib/date-utils";
import {
  sendEditionCancelledEmail,
  sendEditionDatesChangedEmail,
  sendNewEditionEmail,
} from "@/lib/email-notifications";
import { checkApiPermission, editionVisibilityFilter, canAccessArea } from "@/lib/permissions";
import { notifyAllClientUsers, emailAllClientUsers, buildCourseInfoBox, emailParagraph } from "@/lib/notify-client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessArea(session.user.permissions, "edizioni", session.user.isSuperAdmin)) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const edition = await prisma.courseEdition.findUnique({
      where: { id: context.params.edId },
      include: {
        course: { select: { id: true, title: true, durationHours: true } },
        client: { select: { id: true, ragioneSociale: true } },
        _count: { select: { registrations: true, lessons: true, certificates: true } },
      },
    });

    if (!edition || edition.courseId !== context.params.id) {
      return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
    }

    // For view-own: verify access
    const visFilter = editionVisibilityFilter(session);
    if (visFilter) {
      const hasAccess = await prisma.editionReferent.findFirst({
        where: { courseEditionId: edition.id, userId: session.user.id }
      });
      const hasNoReferents = await prisma.editionReferent.count({
        where: { courseEditionId: edition.id }
      });
      if (!hasAccess && hasNoReferents > 0) {
        return NextResponse.json({ error: "Non hai accesso a questa edizione" }, { status: 403 });
      }
    }

    const latestConfirmed = await prisma.courseRegistration.aggregate({
      where: {
        courseEditionId: edition.id,
        status: "CONFIRMED",
      },
      _max: { updatedAt: true },
    });

    return NextResponse.json({
      data: {
        ...edition,
        registrySentAt: latestConfirmed._max.updatedAt ?? null,
      },
    });
  } catch (error) {
    console.error("[COURSE_EDITION_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkApiPermission(session, "edizioni", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = await validateBody(request, courseEditionUpdateSchema);
    if ("error" in validation) {
      return validation.error;
    }

  const existing = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: {
      id: true,
      courseId: true,
      clientId: true,
      editionNumber: true,
      status: true,
      startDate: true,
      endDate: true,
      deadlineRegistry: true,
      notes: true,
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
        },
      },
      course: { select: { title: true } },
    },
  });
  if (!existing || existing.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (existing.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "L'edizione e archiviata. Nessuna modifica consentita." },
      { status: 403 }
    );
  }

  const data = validation.data;
  const presenzaMinimaType =
    data.presenzaMinimaType === "percentage" ||
    data.presenzaMinimaType === "days" ||
    data.presenzaMinimaType === "hours"
      ? data.presenzaMinimaType
      : data.presenzaMinimaType === null
        ? null
        : undefined;
  const presenzaMinimaValue =
    presenzaMinimaType === null
      ? null
      : typeof data.presenzaMinimaValue === "number"
        ? data.presenzaMinimaValue
        : undefined;
  const oldStatus = existing.status;
  const nextStartDate = data.startDate ?? existing.startDate;
  const nextEndDate = data.endDate ?? existing.endDate;
  const nextDeadline = data.deadlineRegistry ?? existing.deadlineRegistry;

  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    return NextResponse.json(
      { error: "La data di fine non può essere precedente alla data di inizio" },
      { status: 400 }
    );
  }

  if (nextStartDate && nextDeadline && nextDeadline >= nextStartDate) {
    return NextResponse.json(
      {
        error:
          "La deadline anagrafiche deve essere precedente alla data di inizio",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.courseEdition.update({
    where: { id: context.params.edId },
    data: {
      clientId: data.clientId ?? undefined,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      deadlineRegistry: data.deadlineRegistry ?? undefined,
      status: data.status ?? undefined,
      presenzaMinimaType,
      presenzaMinimaValue,
      notes: data.notes ?? undefined,
    },
    include: {
      course: { select: { id: true, title: true, durationHours: true } },
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
        },
      },
    },
  });

  if (
    data.clientId &&
    data.clientId !== existing.clientId &&
    oldStatus === "PUBLISHED" &&
    updated.status === "PUBLISHED"
  ) {
    await prisma.notification.create({
      data: {
        type: "NEW_EDITION",
        title: "Nuova edizione disponibile",
        message: `${updated.course.title} (Ed. #${updated.editionNumber}) e ora disponibile.`,
        courseEditionId: updated.id,
        isGlobal: false,
      },
    });
  }

  const newStatus = updated.status;

  const oldStartISO = existing.startDate?.toISOString() ?? null;
  const oldEndISO = existing.endDate?.toISOString() ?? null;
  const oldDeadlineISO = existing.deadlineRegistry?.toISOString() ?? null;
  const newStartISO = updated.startDate?.toISOString() ?? null;
  const newEndISO = updated.endDate?.toISOString() ?? null;
  const newDeadlineISO = updated.deadlineRegistry?.toISOString() ?? null;

  const datesChanged =
    oldStartISO !== newStartISO ||
    oldEndISO !== newEndISO ||
    oldDeadlineISO !== newDeadlineISO;

  if (
    oldStatus !== "PUBLISHED" &&
    newStatus === "PUBLISHED" &&
    updated.client.referenteEmail
  ) {
    await prisma.notification.create({
      data: {
        type: "NEW_EDITION",
        title: "Nuova edizione disponibile",
        message: `${updated.course.title} (Ed. #${updated.editionNumber}) e ora disponibile.`,
        courseEditionId: updated.id,
        isGlobal: false,
      },
    });

    void sendNewEditionEmail({
      clientEmail: updated.client.referenteEmail,
      clientName: updated.client.referenteNome || updated.client.ragioneSociale,
      clientId: updated.client.id,
      courseName: updated.course.title,
      editionNumber: updated.editionNumber,
      startDate: formatDate(updated.startDate),
      endDate: formatDate(updated.endDate),
      deadlineRegistry: formatDate(updated.deadlineRegistry),
      courseEditionId: updated.id,
    });
  }

  if (newStatus === "PUBLISHED" && datesChanged && updated.client.referenteEmail) {
    await prisma.notification.create({
      data: {
        type: "EDITION_DATES_CHANGED",
        title: "Date edizione modificate",
        message: `${updated.course.title} (Ed. #${updated.editionNumber}) ha nuove date: ${formatDate(updated.startDate)} - ${formatDate(updated.endDate)}`,
        courseEditionId: updated.id,
        isGlobal: false,
      },
    });

    void sendEditionDatesChangedEmail({
      clientEmail: updated.client.referenteEmail,
      clientName: updated.client.referenteNome || updated.client.ragioneSociale,
      clientId: updated.client.id,
      courseName: updated.course.title,
      editionNumber: updated.editionNumber,
      oldStartDate: formatDate(existing.startDate),
      newStartDate: formatDate(updated.startDate),
      oldEndDate: formatDate(existing.endDate),
      newEndDate: formatDate(updated.endDate),
      oldDeadline: formatDate(existing.deadlineRegistry),
      newDeadline: formatDate(updated.deadlineRegistry),
      courseEditionId: updated.id,
    });
  }

  if (
    oldStatus === "PUBLISHED" &&
    (newStatus === "CLOSED" || newStatus === "ARCHIVED") &&
    updated.client.referenteEmail
  ) {
    await prisma.notification.create({
      data: {
        type: "EDITION_CANCELLED",
        title: "Edizione annullata",
        message: `${updated.course.title} (Ed. #${updated.editionNumber}) e stata annullata o chiusa.`,
        courseEditionId: updated.id,
        isGlobal: false,
      },
    });

    void sendEditionCancelledEmail({
      clientEmail: updated.client.referenteEmail,
      clientName: updated.client.referenteNome || updated.client.ragioneSociale,
      clientId: updated.client.id,
      courseName: updated.course.title,
      editionNumber: updated.editionNumber,
      courseEditionId: updated.id,
    });

    // Also send COURSE_COMPLETED notification to all client users
    void notifyAllClientUsers({
      clientId: updated.client.id,
      type: "COURSE_COMPLETED",
      title: "Corso completato",
      message: `${updated.course.title} (Ed. #${updated.editionNumber}) è stato completato. Gli attestati saranno disponibili a breve.`,
      courseEditionId: updated.id,
    });
    void emailAllClientUsers({
      clientId: updated.client.id,
      emailType: "COURSE_COMPLETED",
      subject: `Corso completato - ${updated.course.title} (Ed. #${updated.editionNumber})`,
      title: "Corso Completato",
      bodyHtml: `
        ${emailParagraph("Il seguente corso è stato completato:")}
        ${buildCourseInfoBox(updated.course.title, updated.editionNumber)}
        ${emailParagraph("Gli attestati saranno disponibili a breve nella sezione dedicata del portale.")}
      `,
      ctaText: "Vai agli Attestati",
      ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/attestati`,
      courseEditionId: updated.id,
    });
  }

  // 1. Edition info changed (notes/presenzaMinima — non-date fields)
  if (newStatus === "PUBLISHED" && oldStatus === "PUBLISHED") {
    const notesChanged = (existing.notes ?? "") !== (updated.notes ?? "");
    if (notesChanged && updated.client.id) {
      void notifyAllClientUsers({
        clientId: updated.client.id,
        type: "EDITION_INFO_CHANGED",
        title: "Edizione aggiornata",
        message: `${updated.course.title} (Ed. #${updated.editionNumber}) è stata aggiornata con nuove informazioni.`,
        courseEditionId: updated.id,
      });
      void emailAllClientUsers({
        clientId: updated.client.id,
        emailType: "EDITION_INFO_CHANGED",
        subject: `Edizione aggiornata - ${updated.course.title} (Ed. #${updated.editionNumber})`,
        title: "Edizione Aggiornata",
        bodyHtml: `
          ${emailParagraph("Le informazioni della seguente edizione sono state aggiornate:")}
          ${buildCourseInfoBox(updated.course.title, updated.editionNumber)}
          ${emailParagraph("Accedi al portale per i dettagli aggiornati.")}
        `,
        ctaText: "Vedi Dettagli",
        ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/corsi/${updated.id}`,
        courseEditionId: updated.id,
      });
    }
  }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[COURSE_EDITION_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkApiPermission(session, "edizioni", "delete")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

  const existing = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: {
      id: true,
      courseId: true,
      clientId: true,
      editionNumber: true,
      status: true,
      course: { select: { title: true } },
      client: {
        select: {
          id: true,
          ragioneSociale: true,
          referenteNome: true,
          referenteEmail: true,
        },
      },
      _count: {
        select: {
          registrations: true,
          lessons: true,
          attendances: true,
          certificates: true,
        },
      },
    },
  });
  if (!existing || existing.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (existing.status === "PUBLISHED" && existing.client?.referenteEmail) {
    await prisma.notification.create({
      data: {
        type: "EDITION_CANCELLED",
        title: "Edizione annullata",
        message: `${existing.course.title} (Ed. #${existing.editionNumber}) e stata annullata.`,
        courseEditionId: existing.id,
        isGlobal: false,
      },
    });

    void sendEditionCancelledEmail({
      clientEmail: existing.client.referenteEmail,
      clientName: existing.client.referenteNome || existing.client.ragioneSociale,
      clientId: existing.client.id,
      courseName: existing.course.title,
      editionNumber: existing.editionNumber,
      courseEditionId: existing.id,
    });
  }

  const certificates = await prisma.certificate.findMany({
    where: { courseEditionId: context.params.edId },
    select: { id: true, filePath: true },
  });

  for (const cert of certificates) {
    try {
      await deleteCertificateFile(cert.filePath);
    } catch (error) {
      console.error("Errore eliminazione file attestato:", error);
    }
  }

  const notificationsCount = await prisma.notification.count({
    where: { courseEditionId: context.params.edId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: { courseEditionId: context.params.edId },
    });
    await tx.courseEdition.delete({
      where: { id: context.params.edId },
    });
  });

    return NextResponse.json({
      success: true,
      deleted: {
        registrations: existing._count.registrations,
        lessons: existing._count.lessons,
        attendances: existing._count.attendances,
        certificates: existing._count.certificates,
        notifications: notificationsCount,
      },
    });
  } catch (error) {
    console.error("[COURSE_EDITION_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
