import { z } from "zod";
import { isValidCodiceFiscale, isValidClientCodiceFiscale, validatePIVA } from "@/lib/validators";
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
  presenzaMinimaType: z
    .preprocess(
      (value) => (value === "" ? null : value),
      z.enum(["percentage", "days", "hours"]).nullable().optional()
    ),
  presenzaMinimaValue: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return null;
      return value;
    },
    z.coerce.number().int().nullable().optional()
  ),
  notes: z.string().max(2000).optional().nullable().or(z.literal("")),
  notifyPolicy: z.enum(["REFERENT_ONLY", "REFERENT_PLUS", "ALL"]).optional(),
  notifyExtraUserIds: z.array(z.string()).optional(),
  customFieldSetId: z.string().nullable().optional().transform((val) => val === "" ? null : val),
});

function validateEditionDates(
  data: {
    startDate?: Date;
    endDate?: Date;
    deadlineRegistry?: Date;
    presenzaMinimaType?: "percentage" | "days" | "hours" | null;
    presenzaMinimaValue?: number | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La data di fine non può essere precedente alla data di inizio",
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

  const hasType = data.presenzaMinimaType !== null && data.presenzaMinimaType !== undefined;
  const hasValue =
    data.presenzaMinimaValue !== null && data.presenzaMinimaValue !== undefined;

  if (!hasType && hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Per impostare la presenza minima devi selezionare anche il tipo di requisito",
      path: ["presenzaMinimaType"],
    });
  }

  if (hasType && !hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Per impostare la presenza minima devi indicare anche il valore",
      path: ["presenzaMinimaValue"],
    });
  }

  if (data.presenzaMinimaType === "percentage" && hasValue) {
    const value = data.presenzaMinimaValue as number;
    if (value < 1 || value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La presenza minima in percentuale deve essere tra 1 e 100",
        path: ["presenzaMinimaValue"],
      });
    }
  }

  if (data.presenzaMinimaType === "days" && hasValue) {
    const value = data.presenzaMinimaValue as number;
    if (value < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La presenza minima in lezioni deve essere almeno 1",
        path: ["presenzaMinimaValue"],
      });
    }
  }

  if (data.presenzaMinimaType === "hours" && hasValue) {
    const value = data.presenzaMinimaValue as number;
    if (value < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La presenza minima in ore deve essere almeno 1",
        path: ["presenzaMinimaValue"],
      });
    }
  }
}

export const courseEditionSchema = courseEditionBaseSchema.superRefine(
  validateEditionDates
);

export const courseEditionUpdateSchema = courseEditionBaseSchema
  .partial()
  .superRefine(validateEditionDates);

// Required fields are enforced client-side per mode (default: Nome/Cognome/CF;
// custom: template required fields). The schema validates format when present
// so the same endpoint serves both default and template (custom fields) mode.
// Employee.nome/cognome/codiceFiscale are nullable in the DB.
export const employeeSchema = z.object({
  nome: optionalString(100),
  cognome: optionalString(100),
  codiceFiscale: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .length(16, "Il codice fiscale deve essere di 16 caratteri")
      .refine(isValidCodiceFiscale, "Codice Fiscale non valido")
      .optional()
      .nullable()
  ),
  sesso: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["M", "F"]).optional()
  ),
  dataNascita: optionalDate,
  luogoNascita: optionalString(100),
  email: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().email("Email non valida").optional()
  ),
  telefono: optionalString(30),
  cellulare: optionalString(30),
  indirizzo: optionalString(255),
  comuneResidenza: optionalString(100),
  cap: optionalString(5),
  provincia: optionalString(100),
  regione: optionalString(100),
  emailAziendale: optionalString(255),
  pec: optionalString(255),
  partitaIva: optionalString(20),
  iban: optionalString(50),
  mansione: optionalString(100),
  note: optionalString(500),
  customData: z.record(z.string()).optional().nullable(),
});

export const clientSchema = z.object({
  ragioneSociale: z.string().min(2).max(200),
  piva: z.string().refine(validatePIVA, "Partita IVA non valida"),
  codiceFiscale: z
    .string()
    .trim()
    .min(1, "Codice fiscale obbligatorio")
    .transform((v) => v.toUpperCase().replace(/\s+/g, ""))
    .refine(isValidClientCodiceFiscale, "Codice fiscale non valido (11 cifre o 16 caratteri)"),
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
