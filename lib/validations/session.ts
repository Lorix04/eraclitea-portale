import { z } from 'zod'

export const sessionBase = z.object({
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  pauseStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  pauseEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  docente: z.string().optional(),
  tutor: z.string().optional(),
  aula: z.string().optional(),
  modalita: z.string().optional(),
  note: z.string().optional(),
  isCompleted: z.boolean().optional(),
})

export const sessionSchema = sessionBase
  .refine((v)=> v.startTime < v.endTime, { message: 'startTime must be < endTime', path: ['endTime'] })
  .refine((v)=> !(v.pauseStart && !v.pauseEnd), { message: 'pauseEnd required when pauseStart provided', path: ['pauseEnd'] })
  .refine((v)=> !(v.pauseStart && v.pauseEnd && v.pauseStart >= v.pauseEnd), { message: 'pauseStart < pauseEnd', path: ['pauseEnd'] })

export const sessionPartialSchema = sessionBase.partial()
