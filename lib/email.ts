import nodemailer from 'nodemailer'
import { coursePublishedTemplate } from './email-templates/course-published'
import { certificatesUploadedTemplate } from './email-templates/certificates-uploaded'
import { reminderTemplate } from './email-templates/reminder'
import { NotificationType } from '@prisma/client'

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
})

export async function sendPasswordResetEmail(to: string, link: string) {
  const from = process.env.SMTP_FROM || 'Portale Formazione <noreply@example.com>'
  await mailer.sendMail({
    from,
    to,
    subject: 'Reimposta la tua password',
    html: `<p>Clicca il link per reimpostare la password:</p><p><a href="${link}">${link}</a></p>`,
  })
}

export async function sendNotificationEmail(
  type: NotificationType,
  recipients: { email: string; name: string }[],
  data: Record<string, any>
): Promise<{ sent: number; errors: string[] }> {
  const from = process.env.SMTP_FROM || 'Portale Formazione <noreply@example.com>'
  const canSend = !!process.env.SMTP_HOST
  if (!canSend || recipients.length === 0) return { sent: 0, errors: [] }

  let subject = 'Notifica'
  let html = ''
  if (type === 'COURSE_PUBLISHED') { const t = coursePublishedTemplate(data as any); subject = t.subject; html = t.html }
  if (type === 'CERT_UPLOADED') { const t = certificatesUploadedTemplate(data as any); subject = t.subject; html = t.html }
  if (type === 'REMINDER') { const t = reminderTemplate(data as any); subject = t.subject; html = t.html }

  const errors: string[] = []
  let sent = 0
  for (const r of recipients) {
    try {
      await mailer.sendMail({ from, to: r.email, subject, html })
      sent++
    } catch (e: any) {
      errors.push(`${r.email}: ${e.message}`)
    }
  }
  return { sent, errors }
}
