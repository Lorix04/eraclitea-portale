import { formatDate, formatItalianDate } from "@/lib/date-utils";

interface EmailTemplateOptions {
  title: string;
  greeting: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://portale.example.com";
const BRAND_NAME = "Portale Sapienta";
const LOGO_URL = "https://eraclitea.it/it/wp-content/uploads/2026/02/sapienta-w-d.png";

const BODY_TEXT_STYLE = "margin:0 0 15px; font-size:15px; line-height:1.6; color:#1A1A1A;";

export function emailParagraph(content: string): string {
  return `<p style="${BODY_TEXT_STYLE}">${content}</p>`;
}

export function emailDivider(): string {
  return '<hr style="border:none; border-top:1px solid #E5E7EB; margin:25px 0;" />';
}

export function emailInfoBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border-collapse:collapse;">
    <tr>
      <td style="background-color:#FEF9E7; border-left:4px solid #EAB308; border-radius:0 6px 6px 0; padding:18px 20px;">
        ${content}
      </td>
    </tr>
  </table>`;
}

export function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:25px auto; border-collapse:collapse;">
    <tr>
      <td align="center" style="background-color:#EAB308; border-radius:6px;">
        <a href="${url}" target="_blank" style="display:inline-block; padding:14px 30px; font-size:15px; font-weight:700; color:#0A0A0A; text-decoration:none; letter-spacing:0.5px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { title, greeting, bodyHtml, ctaText, ctaUrl, footerNote } = options;

  const cta = ctaText && ctaUrl ? emailButton(ctaText, ctaUrl) : "";
  const note = footerNote
    ? `<p style="margin:20px 0 0; font-size:13px; color:#6B7280; line-height:1.5;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-collapse:collapse;">
          <tr>
            <td align="center" style="background-color:#0A0A0A; padding:30px 20px;">
              <img src="${LOGO_URL}" alt="Portale Sapienta" width="180" height="50" style="display:block; width:100%; max-width:180px; height:auto;" />
              <p style="margin:10px 0 0; font-size:14px; color:#EAB308; font-weight:600; letter-spacing:1px;">PORTALE SAPIENTA</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF; padding:40px 30px;">
              <h1 style="margin:0 0 20px; font-size:22px; font-weight:700; color:#1A1A1A;">${title}</h1>
              <p style="${BODY_TEXT_STYLE}">${greeting}</p>
              ${bodyHtml}
              ${cta}
              ${note}
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#0A0A0A; padding:25px 20px;">
              <p style="margin:0 0 5px; font-size:12px; color:#9CA3AF; line-height:1.5;">
                Ricevi questa email perche sei registrato sul ${BRAND_NAME}.
              </p>
              <p style="margin:0 0 5px; font-size:12px; color:#9CA3AF; line-height:1.5;">
                Per qualsiasi domanda, contatta il tuo referente.
              </p>
              <p style="margin:10px 0 0; font-size:11px; color:#6B7280;">
                © ${new Date().getFullYear()} ${BRAND_NAME} - Tutti i diritti riservati.
              </p>
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
    title: "Nuova Edizione Disponibile",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("E stata pubblicata una nuova edizione del corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Deadline anagrafiche:</strong> ${formatDate(deadline)}</p>
      `)}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });
}

export function certificatesUploadedTemplate(courseName: string, count: number) {
  return buildEmailHtml({
    title: "Attestati Disponibili",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("Sono stati caricati nuovi attestati per il corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Attestati caricati:</strong> ${count}</p>
      `)}
    `,
    ctaText: "Scarica Attestati",
    ctaUrl: `${PORTAL_URL}/attestati`,
  });
}

export function passwordResetTemplate(tempPassword: string) {
  return buildEmailHtml({
    title: "Reset Password",
    greeting: "Gentile utente,",
    bodyHtml: `
      ${emailParagraph("La tua password e stata reimpostata.")}
      ${emailInfoBox(`
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${tempPassword}</p>
      `)}
      ${emailParagraph("Cambia la password al primo accesso.")}
    `,
    ctaText: "Accedi",
    ctaUrl: `${PORTAL_URL}/login`,
  });
}

export function passwordResetRequestTemplate(resetUrl: string): string {
  return buildEmailHtml({
    title: "Reset Password",
    greeting: "Gentile utente,",
    bodyHtml: `
      ${emailParagraph("Hai richiesto di reimpostare la password.")}
      ${emailParagraph("Clicca il pulsante qui sotto per procedere.")}
    `,
    ctaText: "Reimposta Password",
    ctaUrl: resetUrl,
    footerNote: "Il link scade entro 1 ora. Se non hai richiesto il reset, ignora questa email.",
  });
}

export function expiringCertificatesTemplate(
  certificates: Array<{ employee: string; course: string; expiresAt: Date }>
) {
  const rows = certificates
    .map(
      (cert) => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#1A1A1A;">${cert.employee}</td>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#1A1A1A;">${cert.course}</td>
        <td style="padding:8px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#1A1A1A;">${formatItalianDate(cert.expiresAt)}</td>
      </tr>`
    )
    .join("");

  return buildEmailHtml({
    title: "Attestati in Scadenza",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("I seguenti attestati scadranno a breve:")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; border-collapse:collapse;">
        <thead>
          <tr style="background-color:#FEF9E7;">
            <th style="padding:8px; text-align:left; font-size:13px; color:#1A1A1A; border-bottom:1px solid #E5E7EB;">Dipendente</th>
            <th style="padding:8px; text-align:left; font-size:13px; color:#1A1A1A; border-bottom:1px solid #E5E7EB;">Corso</th>
            <th style="padding:8px; text-align:left; font-size:13px; color:#1A1A1A; border-bottom:1px solid #E5E7EB;">Scadenza</th>
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
    title: "Anagrafiche Ricevute",
    greeting: "Ciao Admin,",
    bodyHtml: `
      ${emailParagraph(`Il cliente <strong>${clientName}</strong> ha inviato le anagrafiche:`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti:</strong> ${count}</p>
      `)}
    `,
    ctaText: "Vai al Pannello Admin",
    ctaUrl: `${PORTAL_URL}/admin/corsi`,
  });
}

export function deadlineReminderTemplate(courseName: string, deadline: Date) {
  return buildEmailHtml({
    title: "Promemoria Deadline",
    greeting: "Gentile cliente,",
    bodyHtml: `
      ${emailParagraph("Ti ricordiamo la prossima deadline per l'invio anagrafiche.")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Scadenza:</strong> ${formatDate(deadline)}</p>
      `)}
    `,
    ctaText: "Compila Anagrafiche",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });
}
