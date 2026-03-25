import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schemas for each CV section
// ---------------------------------------------------------------------------

export const workExperienceSchema = z.object({
  jobTitle: z.string().min(1, "Titolo obbligatorio"),
  employer: z.string().min(1, "Datore di lavoro obbligatorio"),
  city: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  startDate: z.string().min(1, "Data inizio obbligatoria"),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional().nullable(),
});

export const educationSchema = z.object({
  title: z.string().min(1, "Titolo di studio obbligatorio"),
  institution: z.string().min(1, "Istituto obbligatorio"),
  fieldOfStudy: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const languageSchema = z.object({
  language: z.string().min(1, "Lingua obbligatoria"),
  isNative: z.boolean().default(false),
  listening: z.string().optional().nullable(),
  reading: z.string().optional().nullable(),
  speaking: z.string().optional().nullable(),
  writing: z.string().optional().nullable(),
  certificate: z.string().optional().nullable(),
});

export const certificationSchema = z.object({
  name: z.string().min(1, "Nome certificazione obbligatorio"),
  issuingBody: z.string().min(1, "Ente rilascio obbligatorio"),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  credentialId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const skillSchema = z.object({
  name: z.string().min(1, "Nome competenza obbligatorio"),
  category: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
});

export const trainingCourseSchema = z.object({
  title: z.string().min(1, "Titolo corso obbligatorio"),
  provider: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  durationHours: z.number().optional().nullable(),
  topic: z.string().optional().nullable(),
  certificate: z.boolean().default(false),
  description: z.string().optional().nullable(),
});

export const teachingExperienceSchema = z.object({
  courseTitle: z.string().min(1, "Titolo corso obbligatorio"),
  topic: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  totalHours: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const publicationSchema = z.object({
  title: z.string().min(1, "Titolo pubblicazione obbligatorio"),
  publisher: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Section config: maps section key to Prisma model name and schema
// ---------------------------------------------------------------------------

export const CV_SECTIONS = {
  "work-experience": {
    label: "Esperienze lavorative",
    model: "teacherWorkExperience" as const,
    schema: workExperienceSchema,
    dateFields: ["startDate", "endDate"],
  },
  education: {
    label: "Formazione e istruzione",
    model: "teacherEducation" as const,
    schema: educationSchema,
    dateFields: ["startDate", "endDate"],
  },
  languages: {
    label: "Competenze linguistiche",
    model: "teacherLanguage" as const,
    schema: languageSchema,
    dateFields: [],
  },
  certifications: {
    label: "Certificazioni e abilitazioni",
    model: "teacherCertification" as const,
    schema: certificationSchema,
    dateFields: ["issueDate", "expiryDate"],
  },
  skills: {
    label: "Competenze tecniche",
    model: "teacherSkill" as const,
    schema: skillSchema,
    dateFields: [],
  },
  "training-courses": {
    label: "Corsi di formazione",
    model: "teacherTrainingCourse" as const,
    schema: trainingCourseSchema,
    dateFields: ["date"],
  },
  "teaching-experience": {
    label: "Esperienza come docente",
    model: "teacherTeachingExperience" as const,
    schema: teachingExperienceSchema,
    dateFields: ["startDate", "endDate"],
  },
  publications: {
    label: "Pubblicazioni",
    model: "teacherPublication" as const,
    schema: publicationSchema,
    dateFields: ["date"],
  },
} as const;

export type CvSectionKey = keyof typeof CV_SECTIONS;

export function isValidCvSection(section: string): section is CvSectionKey {
  return section in CV_SECTIONS;
}
