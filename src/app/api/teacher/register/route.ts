import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerStep1Schema = z.object({
  token: z.string().min(1),
  data: z.object({
    lastName: z.string().trim().min(1, "Cognome obbligatorio").max(100),
    firstName: z.string().trim().min(1, "Nome obbligatorio").max(100),
    birthDate: z.string().min(1, "Data di nascita obbligatoria"),
    birthPlace: z.string().trim().min(1, "Comune di nascita obbligatorio").max(200),
    birthProvince: z.string().trim().max(10).optional().or(z.literal("")),
    gender: z.preprocess(
      (v) => (v === "" ? null : v),
      z.enum(["M", "F"]).optional().nullable()
    ),
    fiscalCode: z
      .string()
      .trim()
      .min(1, "Codice fiscale obbligatorio")
      .max(16)
      .regex(/^[A-Z0-9]{16}$/i, "Codice fiscale non valido (16 caratteri alfanumerici)"),
    address: z.string().trim().min(1, "Indirizzo obbligatorio").max(200),
    city: z.string().trim().min(1, "Comune obbligatorio").max(200),
    postalCode: z.string().trim().min(1, "CAP obbligatorio").max(10),
    province: z.string().trim().min(1, "Provincia obbligatoria").max(10),
    region: z.string().trim().max(100).optional().or(z.literal("")),
    phone: z.string().trim().max(50).optional().or(z.literal("")),
    mobile: z.string().trim().max(50).optional().or(z.literal("")),
    fax: z.string().trim().max(50).optional().or(z.literal("")),
    emailSecondary: z
      .string()
      .trim()
      .email("Email secondaria non valida")
      .optional()
      .or(z.literal("")),
    pec: z
      .string()
      .trim()
      .email("PEC non valida")
      .optional()
      .or(z.literal("")),
    vatNumber: z.string().trim().max(20).optional().or(z.literal("")),
    iban: z.string().trim().max(34).optional().or(z.literal("")),
    vatExempt: z.preprocess(
      (v) => (typeof v === "string" ? v === "true" : v),
      z.boolean().optional().default(false)
    ),
    publicEmployee: z.preprocess(
      (v) => {
        if (v === "true") return true;
        if (v === "false") return false;
        if (v === "" || v === null || v === undefined) return null;
        return v;
      },
      z.boolean().optional().nullable()
    ),
    educationLevel: z.string().trim().max(100).optional().or(z.literal("")),
    profession: z.string().trim().max(200).optional().or(z.literal("")),
    employerName: z.string().trim().max(200).optional().or(z.literal("")),
    sdiCode: z.string().trim().max(20).optional().or(z.literal("")),
    registrationNumber: z.string().trim().max(50).optional().or(z.literal("")),
  }),
});

async function validateToken(token: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { inviteToken: token },
    select: { id: true, status: true, inviteTokenExpiry: true, userId: true },
  });

  if (!teacher) return null;
  if (teacher.userId) return null;
  if (
    teacher.inviteTokenExpiry &&
    new Date() > new Date(teacher.inviteTokenExpiry)
  ) {
    return null;
  }

  return teacher;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerStep1Schema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Dati non validi" },
        { status: 400 }
      );
    }

    const { token, data } = parsed.data;
    const teacher = await validateToken(token);

    if (!teacher) {
      return NextResponse.json(
        { error: "Token non valido o scaduto" },
        { status: 400 }
      );
    }

    const emptyToNull = (v: string | undefined | null) =>
      v && v.trim() ? v.trim() : null;

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        lastName: data.lastName.trim(),
        firstName: data.firstName.trim(),
        birthDate: new Date(data.birthDate),
        birthPlace: data.birthPlace.trim(),
        birthProvince: emptyToNull(data.birthProvince)?.toUpperCase() || null,
        gender: data.gender || null,
        fiscalCode: data.fiscalCode.trim().toUpperCase(),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        postalCode: emptyToNull(data.postalCode),
        province: emptyToNull(data.province)?.toUpperCase() || null,
        region: emptyToNull(data.region),
        phone: emptyToNull(data.phone),
        mobile: emptyToNull(data.mobile),
        fax: emptyToNull(data.fax),
        emailSecondary: emptyToNull(data.emailSecondary),
        pec: emptyToNull(data.pec),
        vatNumber: emptyToNull(data.vatNumber),
        iban: emptyToNull(data.iban),
        vatExempt: data.vatExempt ?? false,
        publicEmployee: data.publicEmployee ?? null,
        educationLevel: emptyToNull(data.educationLevel),
        profession: emptyToNull(data.profession),
        employerName: emptyToNull(data.employerName),
        sdiCode: emptyToNull(data.sdiCode) || "0000000",
        registrationNumber: emptyToNull(data.registrationNumber),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_REGISTER_STEP1] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
