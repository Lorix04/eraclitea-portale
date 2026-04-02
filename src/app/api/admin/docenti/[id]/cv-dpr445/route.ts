import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { sendAutoEmail } from "@/lib/email-service";
import {
  buildEmailHtml,
  emailParagraph,
  emailInfoBox,
} from "@/lib/email-templates";
import { createTeacherNotification } from "@/lib/teacher-notifications";

export const dynamic = "force-dynamic";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

// ─── GET — Stato CV DPR 445 del docente ─────────────────────
export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("docenti", "view");
  if (check instanceof NextResponse) return check;

  const teacherId = context.params.id;

  const cvDpr = await prisma.teacherCvDpr445.findUnique({
    where: { teacherId },
  });

  if (!cvDpr) {
    return NextResponse.json({
      data: {
        status: "NOT_REQUESTED",
        requestedAt: null,
        deadline: null,
        submittedAt: null,
        filePath: null,
        fileName: null,
        reviewedAt: null,
        rejectionReason: null,
        formData: null,
      },
    });
  }

  return NextResponse.json({
    data: {
      id: cvDpr.id,
      status: cvDpr.status,
      requestedAt: cvDpr.requestedAt,
      requestedById: cvDpr.requestedById,
      deadline: cvDpr.deadline,
      submittedAt: cvDpr.submittedAt,
      filePath: cvDpr.filePath,
      fileName: cvDpr.fileName,
      fileSize: cvDpr.fileSize,
      reviewedAt: cvDpr.reviewedAt,
      reviewedById: cvDpr.reviewedById,
      rejectionReason: cvDpr.rejectionReason,
      reminderSentAt: cvDpr.reminderSentAt,
      consensoPrivacy: cvDpr.consensoPrivacy,
      formData: {
        prerequisitoTitoloStudio: cvDpr.prerequisitoTitoloStudio,
        criterioSelezionato: cvDpr.criterioSelezionato,
        criterioSpecifica: cvDpr.criterioSpecifica,
        areeTematiche: cvDpr.areeTematiche,
        documentazioneProbante: cvDpr.documentazioneProbante,
        abilitazioneAttrezzature: cvDpr.abilitazioneAttrezzature,
        attrezzatureTeoriche: cvDpr.attrezzatureTeoriche,
        attrezzaturePratiche: cvDpr.attrezzaturePratiche,
        abilitazioneAmbientiConfinati: cvDpr.abilitazioneAmbientiConfinati,
        abilitazioneAntincendio: cvDpr.abilitazioneAntincendio,
        antincendioIpotesi: cvDpr.antincendioIpotesi,
        abilitazionePonteggi: cvDpr.abilitazionePonteggi,
        abilitazioneFuni: cvDpr.abilitazioneFuni,
        abilitazioneSegnaleticaStradale: cvDpr.abilitazioneSegnaleticaStradale,
        abilitazioneDiisocianati: cvDpr.abilitazioneDiisocianati,
        abilitazioneHACCP: cvDpr.abilitazioneHACCP,
        abilitazionePrimoSoccorso: cvDpr.abilitazionePrimoSoccorso,
        abilitazionePESPAVPEI: cvDpr.abilitazionePESPAVPEI,
      },
    },
  });
}

// ─── POST — Richiedi compilazione CV ─────────────────────────
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("docenti", "edit");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const teacherId = context.params.id;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
      status: true,
    },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
  }

  let body: {
    deadline?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    // defaults
  }

  const deadline = body.deadline ? new Date(body.deadline) : null;
  const sendEmail = body.sendEmail !== false;
  const sendNotification = body.sendNotification !== false;

  // Upsert: create or reset to REQUESTED
  await prisma.teacherCvDpr445.upsert({
    where: { teacherId },
    create: {
      teacherId,
      status: "REQUESTED",
      requestedAt: new Date(),
      requestedById: session.user.id,
      deadline,
    },
    update: {
      status: "REQUESTED",
      requestedAt: new Date(),
      requestedById: session.user.id,
      deadline,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });

  // Send email
  if (sendEmail && teacher.email) {
    const deadlineText = deadline
      ? `Scadenza: ${deadline.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}`
      : "";
    const html = buildEmailHtml({
      title: "Richiesta CV DPR 445/2000",
      greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
      bodyHtml: `
        ${emailParagraph("Ti chiediamo di compilare il Curriculum Vitae ai sensi del DPR 445/2000.")}
        ${emailInfoBox(`
          <p style="margin:0 0 4px; font-size:14px;"><strong>Cosa fare:</strong></p>
          <p style="margin:0 0 4px; font-size:14px;">1. Accedi al portale e vai nella sezione Documenti</p>
          <p style="margin:0 0 4px; font-size:14px;">2. Scarica il template PDF</p>
          <p style="margin:0 0 4px; font-size:14px;">3. Compila il documento e ricaricalo nel portale</p>
          ${deadlineText ? `<p style="margin:8px 0 0; font-size:14px;"><strong>${deadlineText}</strong></p>` : ""}
        `)}
      `,
      ctaText: "Accedi al Portale",
      ctaUrl: `${PORTAL_URL}/docente/documenti`,
    });

    void sendAutoEmail({
      emailType: "CV_DPR445_REQUEST",
      recipientEmail: teacher.email,
      recipientName: `${teacher.firstName} ${teacher.lastName}`,
      recipientId: teacher.userId ?? undefined,
      subject: "Richiesta compilazione CV DPR 445/2000",
      html,
      ignorePreference: true,
    });
  }

  // Send notification
  if (sendNotification && teacher.userId) {
    await createTeacherNotification({
      userId: teacher.userId,
      type: "CV_DPR445_REQUEST",
      title: "Richiesta CV DPR 445/2000",
      message: "Ti e stata richiesta la compilazione del CV ai sensi del DPR 445/2000.",
    });
  }

  return NextResponse.json({ success: true });
}

// ─── PUT — Approva / Rifiuta / Invia reminder ───────────────
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("docenti", "edit");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  const teacherId = context.params.id;

  let body: {
    action?: string;
    rejectionReason?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const cvDpr = await prisma.teacherCvDpr445.findUnique({
    where: { teacherId },
    select: { id: true, status: true },
  });

  if (!cvDpr) {
    return NextResponse.json({ error: "CV non trovato" }, { status: 404 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  });

  if (body.action === "approve") {
    if (cvDpr.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Il CV deve essere in stato SUBMITTED per essere approvato" },
        { status: 400 }
      );
    }

    await prisma.teacherCvDpr445.update({
      where: { teacherId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        rejectionReason: null,
      },
    });

    if (teacher?.email) {
      const html = buildEmailHtml({
        title: "CV DPR 445/2000 Approvato",
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml: emailParagraph("Il tuo CV ai sensi del DPR 445/2000 e stato approvato. Grazie per la collaborazione."),
        ctaText: "Accedi al Portale",
        ctaUrl: `${PORTAL_URL}/docente/documenti`,
      });
      void sendAutoEmail({
        emailType: "CV_DPR445_APPROVED",
        recipientEmail: teacher.email,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject: "CV DPR 445/2000 — Approvato",
        html,
      });
    }
    if (teacher?.userId) {
      await createTeacherNotification({
        userId: teacher.userId,
        type: "CV_DPR445_APPROVED",
        title: "CV DPR 445 approvato",
        message: "Il tuo CV ai sensi del DPR 445/2000 e stato approvato.",
      });
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "reject") {
    if (cvDpr.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Il CV deve essere in stato SUBMITTED per essere rifiutato" },
        { status: 400 }
      );
    }
    if (!body.rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "Il motivo del rifiuto e obbligatorio" },
        { status: 400 }
      );
    }

    await prisma.teacherCvDpr445.update({
      where: { teacherId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        rejectionReason: body.rejectionReason.trim(),
      },
    });

    if (teacher?.email) {
      const html = buildEmailHtml({
        title: "CV DPR 445/2000 — Revisione richiesta",
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml: `
          ${emailParagraph("Il tuo CV ai sensi del DPR 445/2000 necessita di modifiche.")}
          ${emailInfoBox(`<p style="margin:0; font-size:14px;"><strong>Motivo:</strong> ${body.rejectionReason!.trim()}</p>`)}
          ${emailParagraph("Ti chiediamo di ricompilare e reinviare il documento.")}
        `,
        ctaText: "Accedi al Portale",
        ctaUrl: `${PORTAL_URL}/docente/documenti`,
      });
      void sendAutoEmail({
        emailType: "CV_DPR445_REJECTED",
        recipientEmail: teacher.email,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject: "CV DPR 445/2000 — Revisione richiesta",
        html,
      });
    }
    if (teacher?.userId) {
      await createTeacherNotification({
        userId: teacher.userId,
        type: "CV_DPR445_REJECTED",
        title: "CV DPR 445 da rivedere",
        message: `Il tuo CV DPR 445 e stato rifiutato: ${body.rejectionReason!.trim()}`,
      });
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "reminder") {
    if (cvDpr.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Il reminder puo essere inviato solo per CV in stato REQUESTED" },
        { status: 400 }
      );
    }

    await prisma.teacherCvDpr445.update({
      where: { teacherId },
      data: { reminderSentAt: new Date() },
    });

    if (teacher?.email) {
      const html = buildEmailHtml({
        title: "Promemoria: CV DPR 445/2000",
        greeting: `Gentile ${teacher.firstName} ${teacher.lastName},`,
        bodyHtml: emailParagraph("Ti ricordiamo di compilare e inviare il CV ai sensi del DPR 445/2000. Accedi al portale per procedere."),
        ctaText: "Accedi al Portale",
        ctaUrl: `${PORTAL_URL}/docente/documenti`,
      });
      void sendAutoEmail({
        emailType: "CV_DPR445_REMINDER",
        recipientEmail: teacher.email,
        recipientName: `${teacher.firstName} ${teacher.lastName}`,
        recipientId: teacher.userId ?? undefined,
        subject: "Promemoria — CV DPR 445/2000",
        html,
        ignorePreference: true,
      });
    }
    if (teacher?.userId) {
      await createTeacherNotification({
        userId: teacher.userId,
        type: "CV_DPR445_REMINDER",
        title: "Promemoria CV DPR 445",
        message: "Ti ricordiamo di compilare il CV ai sensi del DPR 445/2000.",
      });
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "cancel") {
    await prisma.teacherCvDpr445.update({
      where: { teacherId },
      data: {
        status: "NOT_REQUESTED",
        requestedAt: null,
        requestedById: null,
        deadline: null,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
}
