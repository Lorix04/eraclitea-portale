import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph } from "@/lib/email-templates";
import { checkApiPermission } from "@/lib/permissions";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "invite")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (teacher.status !== "ONBOARDING") {
      return NextResponse.json(
        { error: "Il sollecito puo essere inviato solo ai docenti in fase di onboarding" },
        { status: 400 }
      );
    }

    if (!teacher.email) {
      return NextResponse.json(
        { error: "Il docente non ha un indirizzo email" },
        { status: 400 }
      );
    }

    const fullName = `${teacher.firstName} ${teacher.lastName}`;
    const loginUrl = `${PORTAL_URL}/login`;

    const html = buildEmailHtml({
      title: "Completa la registrazione",
      greeting: `Gentile ${fullName},`,
      bodyHtml: `
        ${emailParagraph("ti ricordiamo che la tua registrazione sul Portale Sapienta non e ancora completa.")}
        ${emailParagraph("Per completare la procedura, accedi al portale e firma i documenti richiesti.")}
      `,
      ctaText: "Accedi al portale",
      ctaUrl: loginUrl,
      footerNote: "Questa email e stata inviata automaticamente. Non rispondere a questo messaggio.",
    });

    void sendAutoEmail({
      emailType: "TEACHER_REMINDER",
      recipientEmail: teacher.email,
      recipientName: fullName,
      subject: "Completa la tua registrazione — Portale Sapienta",
      html,
      meta: {
        teacherId: teacher.id,
      },
      ignorePreference: true,
    });

    return NextResponse.json({
      success: true,
      message: `Sollecito inviato a ${teacher.email}`,
    });
  } catch (error) {
    console.error("[ADMIN_TEACHER_REMIND] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
