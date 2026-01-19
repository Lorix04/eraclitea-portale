export function reminderTemplate(data: { clientName: string; courseName: string; deadline: string; daysLeft: number; portalUrl: string }) {
  return {
    subject: `Promemoria scadenza iscrizioni: ${data.courseName}`,
    html: `
      <h2>Gentile ${data.clientName},</h2>
      <p>Le iscrizioni per il corso <strong>${data.courseName}</strong> scadranno il <strong>${data.deadline}</strong> (tra ${data.daysLeft} giorni).</p>
      <p>Accedi al portale per completare le iscrizioni:</p>
      <a href="${data.portalUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Vai al Portale</a>
      <p style="margin-top:30px;color:#666;font-size:12px;">Questa email è stata inviata automaticamente dal Portale Formazione.</p>
    `,
  }
}
