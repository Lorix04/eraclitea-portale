export function coursePublishedTemplate(data: {
  clientName: string
  courseName: string
  courseDate: string
  deadline: string
  portalUrl: string
}) {
  return {
    subject: `Nuovo corso disponibile: ${data.courseName}`,
    html: `
      <h2>Gentile ${data.clientName},</h2>
      <p>È stato pubblicato un nuovo corso di formazione:</p>
      <div style="background:#f5f5f5;padding:20px;margin:20px 0;border-radius:8px;">
        <h3 style="margin:0 0 10px 0;">${data.courseName}</h3>
        <p><strong>Data:</strong> ${data.courseDate}</p>
        <p><strong>Scadenza iscrizioni:</strong> ${data.deadline}</p>
      </div>
      <p>Accedi al portale per iscrivere i tuoi dipendenti:</p>
      <a href="${data.portalUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">
        Vai al Portale
      </a>
      <p style="margin-top:30px;color:#666;font-size:12px;">
        Questa email è stata inviata automaticamente dal Portale Formazione.
      </p>
    `
  }
}
