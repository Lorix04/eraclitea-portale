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

export async function POST(request: Request) {
  const check = await requirePermission("docenti", "edit");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  let body: {
    target?: string;
    teacherIds?: string[];
    deadline?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { target, teacherIds, sendEmail = true, sendNotification = true } = body;
  const deadline = body.deadline ? new Date(body.deadline) : null;

  // Find target teachers
  let where: any = { status: "ACTIVE" };

  if (target === "all_without_cv") {
    where.cvDpr445 = null;
  } else if (target === "all_without_approved_cv") {
    where.OR = [
      { cvDpr445: null },
      { cvDpr445: { status: { not: "APPROVED" } } },
    ];
  } else if (target === "selected" && teacherIds?.length) {
    where.id = { in: teacherIds };
  } else {
    return NextResponse.json(
      { error: "Specifica il target: all_without_cv, all_without_approved_cv, o selected" },
      { status: 400 }
    );
  }

  const teachers = await prisma.teacher.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
      cvDpr445: { select: { status: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const teacher of teachers) {
    // Skip already approved
    if (teacher.cvDpr445?.status === "APPROVED") {
      skipped++;
      continue;
    }

    // Upsert CV record
    await prisma.teacherCvDpr445.upsert({
      where: { teacherId: teacher.id },
      create: {
        teacherId: teacher.id,
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

    // Send email (will be queued by email-queue)
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
            <p style="margin:0 0 4px; font-size:14px;">Accedi al portale, vai nella sezione Documenti, scarica il template e ricarica il documento compilato.</p>
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

    sent++;
  }

  return NextResponse.json({ sent, skipped, total: teachers.length });
}
