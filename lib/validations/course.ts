import { z } from 'zod'

export const courseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  dateStart: z.coerce.date().optional(),
  dateEnd: z.coerce.date().optional(),
  deadlineRegistry: z.coerce.date().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']),
})

export type CourseInput = z.infer<typeof courseSchema>
