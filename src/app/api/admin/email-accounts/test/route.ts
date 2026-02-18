import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import nodemailer from "nodemailer";
import { authOptions } from "@/lib/auth";
import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";

const testSchema = z.object({
  smtpHost: z.string().trim().min(1, "Host SMTP obbligatorio"),
  smtpPort: z.coerce
    .number()
    .int("Porta SMTP non valida")
    .min(1, "Porta SMTP non valida")
    .max(65535, "Porta SMTP non valida"),
  smtpUser: z.string().trim().min(1, "Utente SMTP obbligatorio"),
  smtpPass: z.string().min(1, "Password SMTP obbligatoria"),
  smtpSecure: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true"),
  senderName: z.string().trim().optional(),
  senderEmail: z.string().trim().email("Email mittente non valida"),
  testRecipient: z.string().trim().email("Email destinatario test non valida"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Parametri mancanti";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const transporter = nodemailer.createTransport({
      host: data.smtpHost,
      port: data.smtpPort,
      secure: data.smtpSecure,
      auth: { user: data.smtpUser, pass: data.smtpPass },
      connectionTimeout: 10000,
    });

    await transporter.verify();

    const from = data.senderName
      ? `"${data.senderName}" <${data.senderEmail}>`
      : data.senderEmail;

    await transporter.sendMail({
      from,
      to: data.testRecipient,
      subject: "Test Configurazione Email - Sapienta",
      html: buildEmailHtml({
        title: "Configurazione Email Funzionante",
        greeting: "Gentile amministratore,",
        bodyHtml: `
          ${emailParagraph("Se stai leggendo questa email, la configurazione SMTP e corretta.")}
          ${emailInfoBox(`
            <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Host:</strong> ${data.smtpHost}:${data.smtpPort}</p>
            <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Mittente:</strong> ${from}</p>
            <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Data:</strong> ${new Date().toLocaleString("it-IT")}</p>
          `)}
        `,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Email di test inviata con successo",
    });
  } catch (error) {
    console.error("Errore test email:", error);

    const smtpError = error as {
      code?: string;
      responseCode?: number;
      message?: string;
    };

    let userMessage = "Errore sconosciuto";
    if (smtpError.code === "ECONNREFUSED") {
      userMessage = `Connessione rifiutata a ${data.smtpHost}:${data.smtpPort}. Verifica host e porta.`;
    } else if (smtpError.code === "EAUTH" || smtpError.responseCode === 535) {
      userMessage = "Autenticazione fallita. Verifica utente e password SMTP.";
    } else if (smtpError.code === "ETIMEDOUT") {
      userMessage = `Timeout connessione a ${data.smtpHost}:${data.smtpPort}. Verifica host e porta.`;
    } else if (smtpError.code === "ESOCKET") {
      userMessage =
        "Errore SSL/TLS. Prova a cambiare l'impostazione SSL/TLS o la porta.";
    } else if (smtpError.message) {
      userMessage = smtpError.message;
    }

    return NextResponse.json(
      { success: false, message: userMessage },
      { status: 400 }
    );
  }
}
