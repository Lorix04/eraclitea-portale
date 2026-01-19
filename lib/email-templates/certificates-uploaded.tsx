export function certificatesUploadedTemplate(data: { clientName: string; courseName: string; count: number; portalUrl: string }) {
  return {
    subject: `Caricati ${data.count} attestati - ${data.courseName}`,
    html: `
      <h2>Gentile ${data.clientName},</h2>
      <p>Sono stati caricati ${data.count} attestati per il corso <strong>${data.courseName}</strong>.</p>
      <p>Accedi al portale per scaricarli:</p>
      <a href="${data.portalUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Vai al Portale</a>
      <p style="margin-top:30px;color:#666;font-size:12px;">Questa email è stata inviata automaticamente dal Portale Formazione.</p>
    `,
  }
}
