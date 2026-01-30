import { formatItalianDate } from "@/lib/date-utils";

﻿export function coursePublishedTemplate(courseName: string, deadline: Date | null) {
  const deadlineText = deadline
    ? formatItalianDate(deadline)
    : "Da definire";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuovo Corso Disponibile</h2>
      <p>E stato pubblicato un nuovo corso di formazione:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${courseName}</h3>
        <p style="margin: 0; color: #6b7280;">
          Scadenza iscrizioni: <strong>${deadlineText}</strong>
        </p>
      </div>
      <p>Accedi al portale per inserire le anagrafiche dei dipendenti.</p>
      <a href="${process.env.NEXTAUTH_URL}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Vai al Portale
      </a>
    </div>
  `;
}

export function certificatesUploadedTemplate(courseName: string, count: number) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Attestati Disponibili</h2>
      <p>Sono stati caricati <strong>${count}</strong> nuovi attestati per il corso:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0;">${courseName}</h3>
      </div>
      <p>Accedi al portale per scaricarli.</p>
      <a href="${process.env.NEXTAUTH_URL}/attestati" 
         style="display: inline-block; background: #059669; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Scarica Attestati
      </a>
    </div>
  `;
}

export function passwordResetTemplate(tempPassword: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Reset Password</h2>
      <p>La tua password e stata reimpostata. Usa la password temporanea qui sotto per accedere:</p>
      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; 
                  border: 1px solid #fecaca;">
        <code style="font-size: 18px; font-weight: bold;">${tempPassword}</code>
      </div>
      <p style="color: #dc2626;"><strong>Importante:</strong> Cambia la password dopo il primo accesso.</p>
      <a href="${process.env.NEXTAUTH_URL}/login" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Accedi
      </a>
    </div>
  `;
}

export function passwordResetRequestTemplate(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Reset Password</h2>
      <p>Hai richiesto di reimpostare la tua password.</p>
      <p>Clicca il pulsante qui sotto per procedere:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reimposta Password
      </a>
      <p style="color: #6b7280; font-size: 14px;">
        Questo link scadrà tra 1 ora.
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Se non hai richiesto il reset, ignora questa email.
      </p>
    </div>
  `;
}

export function expiringCertificatesTemplate(
  certificates: Array<{ employee: string; course: string; expiresAt: Date }>
) {
  const list = certificates
    .map(
      (cert) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cert.employee}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cert.course}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">
        ${formatItalianDate(cert.expiresAt)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Attestati in Scadenza</h2>
      <p>I seguenti attestati scadranno nei prossimi 30 giorni:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Dipendente</th>
            <th style="padding: 8px; text-align: left;">Corso</th>
            <th style="padding: 8px; text-align: left;">Scadenza</th>
          </tr>
        </thead>
        <tbody>${list}</tbody>
      </table>
      <p>Pianifica il rinnovo della formazione.</p>
    </div>
  `;
}

export function registrySubmittedTemplate(
  clientName: string,
  courseName: string,
  count: number
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Anagrafiche Ricevute</h2>
      <p>L'azienda <strong>${clientName}</strong> ha inviato le anagrafiche per:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${courseName}</h3>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #2563eb;">
          ${count} dipendenti
        </p>
      </div>
      <p>Accedi al pannello admin per visualizzare i dettagli e scaricare il CSV.</p>
      <a href="${process.env.NEXTAUTH_URL}/admin/corsi" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Vai al Pannello Admin
      </a>
    </div>
  `;
}

export function deadlineReminderTemplate(courseName: string, deadline: Date) {
  const daysLeft = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Promemoria Scadenza</h2>
      <p>Ti ricordiamo che mancano <strong>${daysLeft} giorni</strong> alla scadenza per l'invio delle anagrafiche:</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 8px 0;">${courseName}</h3>
        <p style="margin: 0; color: #92400e;">
          Scadenza: <strong>${formatItalianDate(deadline)}</strong>
        </p>
      </div>
      <p>Accedi al portale per completare l'inserimento dei dipendenti.</p>
      <a href="${process.env.NEXTAUTH_URL}/corsi" 
         style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Compila Anagrafiche
      </a>
    </div>
  `;
}
