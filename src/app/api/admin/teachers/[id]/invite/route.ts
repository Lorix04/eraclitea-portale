import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph, emailInfoBox } from "@/lib/email-templates";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";
const INVITE_EXPIRY_DAYS = 7;

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        userId: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    if (!teacher.email) {
      return NextResponse.json(
        { error: "Il docente non ha un indirizzo email" },
        { status: 400 }
      );
    }

    if (teacher.status === "ACTIVE" || teacher.status === "ONBOARDING") {
      return NextResponse.json(
        { error: "Il docente ha gia completato la registrazione" },
        { status: 400 }
      );
    }

    if (teacher.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Il docente e sospeso" },
        { status: 400 }
      );
    }

    if (teacher.userId) {
      return NextResponse.json(
        { error: "Il docente ha gia un account utente collegato" },
        { status: 400 }
      );
    }

    const token = randomUUID();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + INVITE_EXPIRY_DAYS);

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        inviteToken: token,
        inviteTokenExpiry: expiry,
        inviteSentAt: new Date(),
        status: "PENDING",
      },
    });

    const registrationUrl = `${PORTAL_URL}/registrazione/docente/${token}`;
    const fullName = `${teacher.firstName} ${teacher.lastName}`;

    const html = buildEmailHtml({
      title: "Registrazione Docente",
      greeting: `Gentile ${fullName},`,
      bodyHtml: `
        ${emailParagraph("sei stato invitato a registrarti come docente sul Portale Sapienta di Accademia Eraclitea.")}
        ${emailParagraph("Per completare la registrazione, clicca sul pulsante seguente:")}
      `,
      ctaText: "Completa la registrazione",
      ctaUrl: registrationUrl,
      afterCtaHtml: `
        ${emailInfoBox(`
          <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;">Durante la registrazione ti verra chiesto di:</p>
          <ol style="margin:0; padding-left:20px; font-size:14px; color:#1A1A1A;">
            <li>Compilare i tuoi dati anagrafici</li>
            <li>Firmare la dichiarazione sostitutiva dell'atto di notorieta</li>
            <li>Scegliere una password per accedere al portale</li>
          </ol>
        `)}
        ${emailParagraph(`Il link e valido per ${INVITE_EXPIRY_DAYS} giorni.`)}
        ${emailParagraph('Per qualsiasi domanda, contatta la segreteria all\'indirizzo <a href="mailto:segreteria@sapienta.it" style="color:#B8860B;">segreteria@sapienta.it</a>.')}
      `,
      footerNote: "Questa email e stata inviata automaticamente. Non rispondere a questo messaggio.",
    });

    void sendAutoEmail({
      emailType: "TEACHER_INVITE",
      recipientEmail: teacher.email,
      recipientName: fullName,
      subject: "Registrazione Docente — Portale Sapienta",
      html,
      meta: {
        teacherId: teacher.id,
        inviteToken: token,
      },
      ignorePreference: true,
    });

    return NextResponse.json({
      success: true,
      message: `Invito inviato a ${teacher.email}`,
      inviteTokenExpiry: expiry.toISOString(),
    });
  } catch (error) {
    console.error("[ADMIN_TEACHER_INVITE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
