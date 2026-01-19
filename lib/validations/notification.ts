import { z } from 'zod'

export const createNotificationSchema = z.object({
  type: z.enum(['COURSE_PUBLISHED', 'CERT_UPLOADED', 'REMINDER']),
  title: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
  courseId: z.string().optional(),
  isGlobal: z.boolean(),
  targetClientIds: z.array(z.string()).optional(),
  sendEmail: z.boolean().default(false),
}).refine(data => {
  if (!data.isGlobal && (!data.targetClientIds || data.targetClientIds.length === 0)) {
    return false
  }
  return true
}, { message: 'Seleziona almeno un cliente destinatario' })
