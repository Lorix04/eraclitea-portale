import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";
import { sendAutoEmail } from "@/lib/email-service";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://portale.example.com";

function safeName(name: string | null | undefined, fallback: string): string {
  const value = (name || "").trim();
  return value.length > 0 ? value : fallback;
}

export async function sendWelcomeEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  tempPassword?: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const credentialsHtml = params.tempPassword
    ? `
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${params.clientEmail}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${params.tempPassword}</p>
      `)}
      ${emailParagraph("Ti consigliamo di cambiare la password al primo accesso.")}
    `
    : `
      ${emailInfoBox(`
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${params.clientEmail}</p>
      `)}
      ${emailParagraph("Le credenziali sono state impostate dal nostro team. Se non hai la password, contatta il referente.")}
    `;

  const html = buildEmailHtml({
    title: "Benvenuto nel Portale Formazione",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Il tuo account cliente e stato creato sul portale formazione.")}
      ${credentialsHtml}
    `,
    ctaText: "Accedi al Portale",
    ctaUrl: `${PORTAL_URL}/login`,
    footerNote: "Se non hai richiesto questo account, ignora questa email.",
  });

  return sendAutoEmail({
    emailType: "WELCOME",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: "Benvenuto nel Portale Formazione - Le tue credenziali",
    html,
  });
}

export async function sendNewEditionEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  startDate: string;
  endDate: string;
  deadlineRegistry: string;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);

  const html = buildEmailHtml({
    title: "Nuova Edizione Disponibile",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Una nuova edizione del corso e stata attivata per la tua azienda:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName}</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Edizione:</strong> #${params.editionNumber}</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Periodo:</strong> ${params.startDate} - ${params.endDate}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Deadline anagrafiche:</strong> ${params.deadlineRegistry}</p>
      `)}
      ${emailParagraph("Accedi al portale per inserire le anagrafiche dei dipendenti partecipanti entro la deadline indicata.")}
    `,
    ctaText: "Gestisci Anagrafiche",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });

  return sendAutoEmail({
    emailType: "NEW_EDITION",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Nuova edizione disponibile - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendDeadlineReminderEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  deadlineDate: string;
  daysRemaining: number;
  registeredCount: number;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const emailType =
    params.daysRemaining <= 2 ? "REMINDER_DEADLINE_2D" : "REMINDER_DEADLINE_7D";
  const urgent = params.daysRemaining <= 2;

  const html = buildEmailHtml({
    title: `${urgent ? "ATTENZIONE - " : ""}Promemoria Deadline Anagrafiche`,
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph(`Ti ricordiamo che la deadline per l'inserimento delle anagrafiche e tra <strong>${params.daysRemaining} giorni</strong> (${params.deadlineDate}).`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Deadline:</strong> ${params.deadlineDate}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti inseriti:</strong> ${params.registeredCount}</p>
      `)}
      ${emailParagraph("Accedi al portale per completare o verificare le anagrafiche inserite.")}
    `,
    ctaText: "Vai alle Anagrafiche",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });

  return sendAutoEmail({
    emailType,
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `${urgent ? "URGENTE - " : ""}Reminder anagrafiche: ${params.courseName} (Ed. #${params.editionNumber}) - Scadenza ${params.deadlineDate}`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendCertificatesAvailableEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  certificateCount: number;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const html = buildEmailHtml({
    title: "Attestati Disponibili",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Sono stati caricati gli attestati per il seguente corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Attestati caricati:</strong> ${params.certificateCount}</p>
      `)}
      ${emailParagraph("Accedi al portale per scaricare gli attestati.")}
    `,
    ctaText: "Scarica Attestati",
    ctaUrl: `${PORTAL_URL}/attestati`,
  });

  return sendAutoEmail({
    emailType: "CERTIFICATES_AVAILABLE",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Attestati disponibili - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendCertificateExpiringEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  employeeName: string;
  courseName: string;
  expiryDate: string;
  daysRemaining: number;
  courseEditionId?: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const emailType =
    params.daysRemaining <= 30
      ? "CERTIFICATE_EXPIRING_30D"
      : "CERTIFICATE_EXPIRING_60D";
  const urgent = params.daysRemaining <= 30;

  const html = buildEmailHtml({
    title: `${urgent ? "ATTENZIONE - " : ""}Attestato in Scadenza`,
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph(`Un attestato di un tuo dipendente e in scadenza tra <strong>${params.daysRemaining} giorni</strong>:`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Dipendente:</strong> ${params.employeeName}</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Scadenza:</strong> ${params.expiryDate}</p>
      `)}
      ${emailParagraph("Ti consigliamo di programmare il rinnovo per tempo.")}
    `,
    ctaText: "Vai agli Attestati",
    ctaUrl: `${PORTAL_URL}/attestati`,
  });

  return sendAutoEmail({
    emailType,
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `${urgent ? "ATTENZIONE - " : ""}Attestato in scadenza - ${params.employeeName} (${params.courseName}) - ${params.expiryDate}`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendRegistryIssueEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  issueDescription: string;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);

  const html = buildEmailHtml({
    title: "Richiesta Correzione Anagrafiche",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Le anagrafiche inviate per il seguente corso necessitano di correzioni:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Note:</strong></p>
        <p style="margin:0; white-space:pre-wrap; font-size:14px; color:#1A1A1A;">${params.issueDescription}</p>
      `)}
      ${emailParagraph("Accedi al portale per correggere e re-inviare le anagrafiche.")}
    `,
    ctaText: "Correggi Anagrafiche",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });

  return sendAutoEmail({
    emailType: "REGISTRY_ISSUE",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Correzione richiesta - Anagrafiche ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendRegistryReceivedEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  employeeCount: number;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const html = buildEmailHtml({
    title: "Anagrafiche Ricevute",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Confermiamo la ricezione delle anagrafiche per il seguente corso:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti inseriti:</strong> ${params.employeeCount}</p>
      `)}
      ${emailParagraph("Le anagrafiche saranno verificate dal nostro team.")}
    `,
    footerNote: "Questa e una conferma automatica di ricezione.",
  });

  return sendAutoEmail({
    emailType: "REGISTRY_RECEIVED",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Anagrafiche ricevute - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendEditionDatesChangedEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  oldStartDate: string;
  newStartDate: string;
  oldEndDate: string;
  newEndDate: string;
  oldDeadline?: string;
  newDeadline?: string;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  let changesHtml = "";

  if (params.oldStartDate !== params.newStartDate) {
    changesHtml += `<p style="margin: 4px 0;"><strong>Data inizio:</strong> <span style="text-decoration: line-through; color: #9ca3af;">${params.oldStartDate}</span> -> <strong>${params.newStartDate}</strong></p>`;
  }
  if (params.oldEndDate !== params.newEndDate) {
    changesHtml += `<p style="margin: 4px 0;"><strong>Data fine:</strong> <span style="text-decoration: line-through; color: #9ca3af;">${params.oldEndDate}</span> -> <strong>${params.newEndDate}</strong></p>`;
  }
  if (params.oldDeadline && params.newDeadline && params.oldDeadline !== params.newDeadline) {
    changesHtml += `<p style="margin: 4px 0;"><strong>Deadline anagrafiche:</strong> <span style="text-decoration: line-through; color: #9ca3af;">${params.oldDeadline}</span> -> <strong>${params.newDeadline}</strong></p>`;
  }

  const html = buildEmailHtml({
    title: "Modifica Date Edizione",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Le date della seguente edizione sono state aggiornate:")}
      ${emailInfoBox(`
        <p style=\"margin:0 0 12px; font-size:14px; color:#1A1A1A;\"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        ${changesHtml || "<p style=\"margin:0; font-size:14px; color:#1A1A1A;\">Sono stati aggiornati i dettagli dell'edizione.</p>"}
      `)}
      ${emailParagraph("Ti invitiamo a prendere nota delle nuove date.")}
    `,
    ctaText: "Vedi Dettagli",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });

  return sendAutoEmail({
    emailType: "EDITION_DATES_CHANGED",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Date aggiornate - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendEditionCancelledEmail(params: {
  clientEmail: string;
  clientName?: string | null;
  clientId?: string;
  courseName: string;
  editionNumber: number;
  reason?: string;
  courseEditionId: string;
}) {
  const clientName = safeName(params.clientName, params.clientEmail);
  const html = buildEmailHtml({
    title: "Edizione Cancellata",
    greeting: `Gentile ${clientName},`,
    bodyHtml: `
      ${emailParagraph("Ti informiamo che la seguente edizione e stata cancellata:")}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        ${params.reason ? `<p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Motivo:</strong> ${params.reason}</p>` : ""}
      `)}
      ${emailParagraph("Per ulteriori informazioni, contatta il tuo referente.")}
    `,
    ctaText: "Vai al Portale",
    ctaUrl: `${PORTAL_URL}/corsi`,
  });

  return sendAutoEmail({
    emailType: "EDITION_CANCELLED",
    recipientEmail: params.clientEmail,
    recipientName: clientName,
    recipientId: params.clientId,
    subject: `Edizione cancellata - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendAdminRegistrySubmittedEmail(params: {
  adminEmail: string;
  adminName?: string | null;
  adminId?: string;
  clientName: string;
  courseName: string;
  editionNumber: number;
  employeeCount: number;
  courseEditionId: string;
}) {
  const adminName = safeName(params.adminName, params.adminEmail);
  const html = buildEmailHtml({
    title: "Anagrafiche Inviate da Cliente",
    greeting: `Ciao ${adminName},`,
    bodyHtml: `
      ${emailParagraph(`Il cliente <strong>${params.clientName}</strong> ha inviato le anagrafiche:`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti inseriti:</strong> ${params.employeeCount}</p>
      `)}
      ${emailParagraph("Accedi al portale per verificare le anagrafiche.")}
    `,
    ctaText: "Verifica Anagrafiche",
    ctaUrl: `${PORTAL_URL}/admin/corsi`,
  });

  return sendAutoEmail({
    emailType: "ADMIN_REGISTRY_SUBMITTED",
    recipientEmail: params.adminEmail,
    recipientName: adminName,
    recipientId: params.adminId,
    subject: `Anagrafiche ricevute - ${params.clientName} - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}

export async function sendAdminDeadlineExpiredEmail(params: {
  adminEmail: string;
  adminName?: string | null;
  adminId?: string;
  clientName: string;
  courseName: string;
  editionNumber: number;
  deadlineDate: string;
  registeredCount: number;
  courseEditionId: string;
}) {
  const adminName = safeName(params.adminName, params.adminEmail);
  const html = buildEmailHtml({
    title: "ATTENZIONE - Deadline Scaduta",
    greeting: `Ciao ${adminName},`,
    bodyHtml: `
      ${emailParagraph(`La deadline per le anagrafiche e scaduta e il cliente <strong>${params.clientName}</strong> non ha completato l'inserimento.`)}
      ${emailInfoBox(`
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${params.courseName} (Ed. #${params.editionNumber})</p>
        <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Deadline:</strong> ${params.deadlineDate}</p>
        <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti inseriti:</strong> ${params.registeredCount}</p>
      `)}
      ${emailParagraph("Puoi contattare il cliente per sollecitare l'invio.")}
    `,
    ctaText: "Vedi Dettagli Edizione",
    ctaUrl: `${PORTAL_URL}/admin/corsi`,
  });

  return sendAutoEmail({
    emailType: "ADMIN_DEADLINE_EXPIRED",
    recipientEmail: params.adminEmail,
    recipientName: adminName,
    recipientId: params.adminId,
    subject: `Deadline scaduta - ${params.clientName} - ${params.courseName} (Ed. #${params.editionNumber})`,
    html,
    courseEditionId: params.courseEditionId,
  });
}
