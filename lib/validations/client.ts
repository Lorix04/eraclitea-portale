import { z } from 'zod'

export const clientSchema = z.object({
  ragioneSociale: z.string().min(2),
  piva: z.string().regex(/^\d{11}$/),
  indirizzo: z.string().optional(),
  referenteNome: z.string().min(2),
  referenteEmail: z.string().email(),
  telefono: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type ClientInput = z.infer<typeof clientSchema>
