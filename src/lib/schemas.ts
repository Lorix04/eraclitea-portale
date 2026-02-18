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

const requiredDate = z.preprocess(
  (value) => {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return parseItalianDate(trimmed) ?? value;
    }
    return value;
  },
  z.date({
    required_error: "Data di nascita obbligatoria",
    invalid_type_error: "Data non valida. Usa il formato GG/MM/AAAA",
  })
);

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().max(max).optional().nullable()
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
  visibilityType: z.enum(["ALL", "SELECTED_CLIENTS", "BY_CATEGORY"]).optional(),
  visibilityClientIds: z.array(z.string().cuid()).optional(),
  visibilityCategoryIds: z.array(z.string().cuid()).optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
});

export const courseSchema = courseBaseSchema;

export const courseUpdateSchema = courseBaseSchema.partial();

const courseEditionBaseSchema = z.object({
  clientId: z.string().cuid(),
  startDate: optionalDate,
  endDate: optionalDate,
  deadlineRegistry: optionalDate,
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  notes: z.string().max(2000).optional().nullable().or(z.literal("")),
});

function validateEditionDates(
  data: {
    startDate?: Date;
    endDate?: Date;
    deadlineRegistry?: Date;
  },
  ctx: z.RefinementCtx
) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La data di fine deve essere successiva alla data di inizio",
      path: ["endDate"],
    });
  }

  if (
    data.startDate &&
    data.deadlineRegistry &&
    data.deadlineRegistry >= data.startDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "La deadline anagrafiche deve essere precedente alla data di inizio",
      path: ["deadlineRegistry"],
    });
  }
}

export const courseEditionSchema = courseEditionBaseSchema.superRefine(
  validateEditionDates
);

export const courseEditionUpdateSchema = courseEditionBaseSchema
  .partial()
  .superRefine(validateEditionDates);

export const employeeSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(100),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  codiceFiscale: z
    .string()
    .trim()
    .length(16, "Il codice fiscale deve essere di 16 caratteri")
    .refine(isValidCodiceFiscale, "Codice Fiscale non valido"),
  sesso: z.enum(["M", "F"], { required_error: "Sesso obbligatorio" }),
  dataNascita: requiredDate,
  luogoNascita: z.string().trim().min(1, "Comune di nascita obbligatorio").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email obbligatoria")
    .email("Email non valida"),
  telefono: optionalString(30),
  cellulare: optionalString(30),
  indirizzo: optionalString(255),
  comuneResidenza: z
    .string()
    .trim()
    .min(1, "Comune di residenza obbligatorio")
    .max(100),
  cap: z.string().trim().min(1, "CAP obbligatorio").max(5),
  mansione: optionalString(100),
  note: optionalString(500),
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
  courseEditionId: z.string().cuid().optional(),
  clientId: z.string().cuid(),
  associations: z.array(
    z.object({
      filename: z.string(),
      employeeId: z.string().cuid(),
    })
  ),
});
