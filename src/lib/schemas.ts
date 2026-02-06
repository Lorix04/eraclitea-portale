import { z } from "zod";
import { isValidCodiceFiscale, validatePIVA } from "@/lib/validators";
import { isValidItalianDate, parseItalianDate } from "@/lib/date-utils";

const optionalDate = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string") return parseItalianDate(value) ?? undefined;
    return value;
  },
  z.date().optional()
);

export const italianDateSchema = z
  .string()
  .refine(
    (val) => val === "" || isValidItalianDate(val),
    { message: "Data non valida. Usa il formato GG/MM/AAAA" }
  )
  .transform((val) => (val === "" ? null : parseItalianDate(val)));


const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().int().min(1).max(200).optional()
);


const courseBaseSchema = z.object({
  title: z.string().min(3, "Titolo minimo 3 caratteri").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  durationHours: optionalInt,
  dateStart: optionalDate,
  dateEnd: optionalDate,
  deadlineRegistry: optionalDate,
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  visibilityType: z.enum(["ALL", "SELECTED_CLIENTS", "BY_CATEGORY"]).optional(),
  visibilityClientIds: z.array(z.string().cuid()).optional(),
  visibilityCategoryIds: z.array(z.string().cuid()).optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
});

export const courseSchema = courseBaseSchema.refine(
  (data) => {
    if (data.dateStart && data.dateEnd) {
      return data.dateEnd >= data.dateStart;
    }
    return true;
  },
  { message: "Data fine deve essere successiva a data inizio" }
);

export const courseUpdateSchema = courseBaseSchema.partial().refine(
  (data) => {
    if (data.dateStart && data.dateEnd) {
      return data.dateEnd >= data.dateStart;
    }
    return true;
  },
  { message: "Data fine deve essere successiva a data inizio" }
);

export const employeeSchema = z.object({
  nome: z.string().min(1, "Nome obbligatorio").max(100),
  cognome: z.string().min(1, "Cognome obbligatorio").max(100),
  codiceFiscale: z
    .string()
    .length(16, "CF deve essere 16 caratteri")
    .refine(isValidCodiceFiscale, "Codice Fiscale non valido"),
  dataNascita: optionalDate,
  luogoNascita: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  mansione: z.string().max(100).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
});

export const clientSchema = z.object({
  ragioneSociale: z.string().min(2).max(200),
  piva: z.string().refine(validatePIVA, "Partita IVA non valida"),
  indirizzo: z.string().max(300).optional().or(z.literal("")),
  referenteNome: z.string().min(2).max(100),
  referenteEmail: z.string().email(),
  telefono: z.string().max(20).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  sidebarBgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  sidebarTextColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
});

export const clientCreateSchema = z.object({
  client: clientSchema,
  user: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  categoryIds: z.array(z.string().cuid()).optional(),
});

export const clientUpdateSchema = z.object({
  client: clientSchema,
  user: z
    .object({
      email: z.string().email(),
      password: z.string().min(6).optional().or(z.literal("")),
    })
    .optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
});

export const certificateUploadSchema = z.object({
  courseId: z.string().cuid().optional(),
  clientId: z.string().cuid(),
  associations: z.array(
    z.object({
      filename: z.string(),
      employeeId: z.string().cuid(),
    })
  ),
});
