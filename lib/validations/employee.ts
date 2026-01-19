import { z } from 'zod'
import { CF_REGEX } from '@/lib/utils'

export const employeeSchema = z.object({
  nome: z.string().min(2),
  cognome: z.string().min(2),
  codiceFiscale: z.string().regex(CF_REGEX),
  dataNascita: z.coerce.date().optional(),
  luogoNascita: z.string().optional(),
  email: z.string().email().optional(),
  mansione: z.string().optional(),
  note: z.string().optional(),
})

export type EmployeeInput = z.infer<typeof employeeSchema>
