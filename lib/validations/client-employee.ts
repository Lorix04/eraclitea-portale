import { z } from 'zod'

export const clientEmployeeSchema = z.object({
  nome: z.string().min(2, 'Nome richiesto (min 2 caratteri)'),
  cognome: z.string().min(2, 'Cognome richiesto (min 2 caratteri)'),
  codiceFiscale: z.string()
    .length(16, 'Il Codice Fiscale deve essere di 16 caratteri')
    .regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i, 'Formato Codice Fiscale non valido')
    .transform(v => v.toUpperCase()),
  dataNascita: z.coerce.date().optional().nullable(),
  luogoNascita: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  mansione: z.string().optional(),
  note: z.string().optional(),
})

export const clientEmployeeBatchSchema = z.object({
  employees: z.array(clientEmployeeSchema).min(1, 'Inserisci almeno un dipendente')
})
