import { formatDate, formatItalianDate } from "@/lib/date-utils";

interface EmailTemplateOptions {
  title: string;
  greeting: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  afterCtaHtml?: string;
  footerNote?: string;
}

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";
const LOGO_URL = "https://sapienta.it/icons/sapienta-remove.png";

const BODY_TEXT_STYLE =
  "margin:0 0 16px; font-size:15px; line-height:1.65; color:#333333;";

export function emailParagraph(content: string): string {
  return `<p style="${BODY_TEXT_STYLE}">${content}</p>`;
}

export function emailDivider(): string {
  return '<hr style="border:none; border-top:1px solid #ECECEC; margin:24px 0;" />';
}

export function emailInfoBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border-collapse:collapse;">
    <tr>
      <td style="background-color:#FFF9E6; border-left:4px solid #D4A017; border-radius:0 8px 8px 0; padding:16px 20px; font-size:14px; line-height:1.6; color:#333333;">
        ${content}
      </td>
    </tr>
  </table>`;
}

export function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 16px; border-collapse:collapse;">
    <tr>
      <td align="center" style="background-color:#D4A017; border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block; background-color:#D4A017; color:#FFFFFF; padding:14px 32px; border-radius:8px; font-weight:700; font-size:16px; text-decoration:none; font-family:Arial, Helvetica, sans-serif;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { title, greeting, bodyHtml, ctaText, ctaUrl, afterCtaHtml, footerNote } =
    options;

  const cta = ctaText && ctaUrl ? emailButton(ctaText, ctaUrl) : "";
  const afterCta = afterCtaHtml ?? "";
  const note = footerNote
    ? `<p style="margin:18px 0 0; font-size:13px; line-height:1.6; color:#666666;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F5F5; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background-color:#F5F5F5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; border-collapse:separate; border-spacing:0; background-color:#FFFFFF; border-radius:8px; overflow:hidden;">
          <tr>
            <td align="center" height="120" style="height:120px; background-color:#1A1A2E; padding:26px 20px 18px;">
              <img src="${LOGO_URL}" alt="Logo Sapienta" width="160" style="display:block; width:160px; max-width:160px; height:auto; border:0; margin:0 auto;" />
              <p style="margin:10px 0 0; color:#D4A017; font-size:14px; letter-spacing:3px; font-weight:700;">PORTALE SAPIENTA</p>
            </td>
          </tr>
          <tr>
            <td height="3" style="height:3px; line-height:3px; font-size:0; background-color:#D4A017;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF; padding:40px;">
              <h1 style="margin:0 0 20px; font-size:28px; line-height:1.3; color:#1F2937; font-weight:700;">${title}</h1>
              <p style="${BODY_TEXT_STYLE}">${greeting}</p>
              ${bodyHtml}
              ${cta}
              ${afterCta}
              ${note}
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#F8F8F8; padding:30px 24px; border-top:1px solid #ECECEC;">
              <p style="margin:0 0 6px; font-size:12px; color:#999999; line-height:1.5;">Ricevi questa email perché sei registrato sul Portale Sapienta.</p>
              <p style="margin:0 0 6px; font-size:12px; color:#999999; line-height:1.5;">Per qualsiasi domanda, contatta il tuo referente.</p>
              <p style="margin:0; font-size:12px; color:#999999; line-height:1.5;">© 2026 Portale Sapienta · Tutti i diritti riservati.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function coursePublishedTemplate(courseName: string, deadline: Date | null) {
  return buildEmailHtml({
    title: "Corso pubblicato",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("È stata pubblicata una nuova edizione del corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0;"><strong>Deadline anagrafiche:</strong> ${formatDate(deadline)}</p>
      `)}
    `,
    ctaText: "Visualizza Corso",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });
}

export function certificatesUploadedTemplate(courseName: string, count: number) {
  return buildEmailHtml({
    title: "Attestati disponibili",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("Sono stati caricati nuovi attestati per il corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0;"><strong>Attestati caricati:</strong> ${count}</p>
      `)}
    `,
    ctaText: "Scarica Attestati",
    ctaUrl: `${PORTAL_URL}/attestati`,
  });
}

export function passwordResetTemplate(tempPassword: string) {
  return buildEmailHtml({
    title: "Reimposta la tua password",
    greeting: "Ciao,",
    bodyHtml: `
      ${emailParagraph("La tua password è stata reimpostata.")}
      ${emailInfoBox(`
        <p style="margin:0;"><strong>Password temporanea:</strong> ${tempPassword}</p>
      `)}
      ${emailParagraph("Per sicurezza, cambia la password al primo accesso.")}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${PORTAL_URL}/login`,
  });
}

export function adminResetPasswordTemplate(params: {
  clientName: string;
  email: string;
  newPassword: string;
}) {
  return buildEmailHtml({
    title: "La tua password è stata reimpostata — Sapienta",
    greeting: `Ciao ${params.clientName},`,
    bodyHtml: `
      ${emailParagraph("La tua password per accedere al Portale Sapienta è stata reimpostata dall'amministratore.")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${params.email}</p>
        <p style="margin:0;"><strong>Password:</strong> ${params.newPassword}</p>
      `)}
      ${emailParagraph("Per la tua sicurezza, ti verrà chiesto di cambiare la password al primo accesso.")}
      ${emailParagraph("Se non hai richiesto questa modifica, contatta il supporto.")}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${PORTAL_URL}/login`,
  });
}

export function passwordResetRequestTemplate(resetUrl: string): string {
  return buildEmailHtml({
    title: "Reimposta la tua password",
    greeting: "Ciao,",
    bodyHtml: `
      ${emailParagraph("Hai richiesto il ripristino della password per il tuo account Sapienta.")}
      ${emailParagraph("Clicca sul pulsante qui sotto per scegliere una nuova password.")}
    `,
    ctaText: "Reimposta Password",
    ctaUrl: resetUrl,
    footerNote:
      "Se non hai richiesto questa operazione, ignora questa email. Il link scadrà tra 24 ore.",
  });
}

export function expiringCertificatesTemplate(
  certificates: Array<{ employee: string; course: string; expiresAt: Date }>
) {
  const rows = certificates
    .map(
      (cert) => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#333333;">${cert.employee}</td>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#333333;">${cert.course}</td>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#333333;">${formatItalianDate(cert.expiresAt)}</td>
      </tr>`
    )
    .join("");

  return buildEmailHtml({
    title: "Attestati in scadenza",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("I seguenti attestati scadranno a breve:")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; border-collapse:collapse;">
        <thead>
          <tr style="background-color:#FFF9E6;">
            <th style="padding:8px; text-align:left; font-size:13px; color:#333333; border-bottom:1px solid #E5E7EB;">Dipendente</th>
            <th style="padding:8px; text-align:left; font-size:13px; color:#333333; border-bottom:1px solid #E5E7EB;">Corso</th>
            <th style="padding:8px; text-align:left; font-size:13px; color:#333333; border-bottom:1px solid #E5E7EB;">Scadenza</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `,
    ctaText: "Vai agli Attestati",
    ctaUrl: `${PORTAL_URL}/attestati`,
  });
}

export function registrySubmittedTemplate(
  clientName: string,
  courseName: string,
  count: number
) {
  return buildEmailHtml({
    title: "Anagrafiche ricevute",
    greeting: "Ciao Admin,",
    bodyHtml: `
      ${emailParagraph(`Il cliente <strong>${clientName}</strong> ha inviato le anagrafiche:`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0;"><strong>Dipendenti:</strong> ${count}</p>
      `)}
    `,
    ctaText: "Vai al Pannello Admin",
    ctaUrl: `${PORTAL_URL}/admin/corsi`,
  });
}

export function deadlineReminderTemplate(courseName: string, deadline: Date) {
  return buildEmailHtml({
    title: "Promemoria deadline",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("Ti ricordiamo la prossima deadline per l'invio anagrafiche.")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0;"><strong>Scadenza:</strong> ${formatDate(deadline)}</p>
      `)}
    `,
    ctaText: "Compila Anagrafiche",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });
}