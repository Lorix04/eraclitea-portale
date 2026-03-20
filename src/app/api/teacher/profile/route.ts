import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

/* --- helpers --- */

const toNull = (v: string | undefined | null) =>
  v !== undefined ? (typeof v === "string" && v.trim() ? v.trim() : null) : undefined;

/* --- response shape (shared by GET & PUT) --- */

function teacherToJson(teacher: Record<string, unknown>) {
  return {
    firstName: teacher.firstName ?? "",
    lastName: teacher.lastName ?? "",
    phone: teacher.phone ?? "",
    mobile: teacher.mobile ?? "",
    fax: teacher.fax ?? "",
    emailSecondary: teacher.emailSecondary ?? "",
    pec: teacher.pec ?? "",
    birthDate:
      teacher.birthDate instanceof Date
        ? teacher.birthDate.toISOString()
        : teacher.birthDate ?? "",
    birthPlace: teacher.birthPlace ?? "",
    birthProvince: teacher.birthProvince ?? "",
    gender: teacher.gender ?? "",
    fiscalCode: teacher.fiscalCode ?? "",
    address: teacher.address ?? "",
    city: teacher.city ?? "",
    postalCode: teacher.postalCode ?? "",
    province: teacher.province ?? "",
    region: teacher.region ?? "",
    specialization: teacher.specialization ?? "",
    profession: teacher.profession ?? "",
    educationLevel: teacher.educationLevel ?? "",
    employerName: teacher.employerName ?? "",
    vatNumber: teacher.vatNumber ?? "",
    iban: teacher.iban ?? "",
    vatExempt: teacher.vatExempt ?? false,
    publicEmployee: teacher.publicEmployee ?? null,
    sdiCode: teacher.sdiCode ?? "",
    registrationNumber: teacher.registrationNumber ?? "",
    bio: teacher.bio ?? "",
    notes: teacher.notes ?? "",
  };
}

/* --- GET --- */

export async function GET() {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        mobile: true,
        fax: true,
        emailSecondary: true,
        pec: true,
        birthDate: true,
        birthPlace: true,
        birthProvince: true,
        gender: true,
        fiscalCode: true,
        address: true,
        city: true,
        postalCode: true,
        province: true,
        region: true,
        specialization: true,
        profession: true,
        educationLevel: true,
        employerName: true,
        vatNumber: true,
        iban: true,
        vatExempt: true,
        publicEmployee: true,
        sdiCode: true,
        registrationNumber: true,
        bio: true,
        notes: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json(teacherToJson(teacher as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[TEACHER_PROFILE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

/* --- PUT --- */

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  mobile: z.string().trim().max(50).optional().or(z.literal("")),
  fax: z.string().trim().max(50).optional().or(z.literal("")),
  emailSecondary: z.string().trim().email().optional().or(z.literal("")),
  pec: z.string().trim().email().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  birthPlace: z.string().trim().max(200).optional().or(z.literal("")),
  birthProvince: z.string().trim().max(10).optional().or(z.literal("")),
  gender: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["M", "F"]).optional().nullable()
  ),
  fiscalCode: z.string().trim().max(16).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  province: z.string().trim().max(10).optional().or(z.literal("")),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  specialization: z.string().trim().max(150).optional().or(z.literal("")),
  profession: z.string().trim().max(200).optional().or(z.literal("")),
  educationLevel: z.string().trim().max(100).optional().or(z.literal("")),
  employerName: z.string().trim().max(200).optional().or(z.literal("")),
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
      if (v === "" || v == null) return null;
      return v;
    },
    z.boolean().optional().nullable()
  ),
  sdiCode: z.string().trim().max(20).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(50).optional().or(z.literal("")),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const teacherId = ctx.teacherId;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build the update payload
    const parsedBirthDate =
      data.birthDate && data.birthDate.trim()
        ? new Date(data.birthDate)
        : null;

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: toNull(data.phone),
        mobile: toNull(data.mobile),
        fax: toNull(data.fax),
        emailSecondary: toNull(data.emailSecondary),
        pec: toNull(data.pec),
        birthDate: parsedBirthDate,
        birthPlace: toNull(data.birthPlace),
        birthProvince: data.birthProvince !== undefined
          ? (data.birthProvince?.trim() ? data.birthProvince.trim().toUpperCase() : null)
          : undefined,
        gender: data.gender ?? null,
        fiscalCode: toNull(data.fiscalCode),
        address: toNull(data.address),
        city: toNull(data.city),
        postalCode: toNull(data.postalCode),
        province: data.province !== undefined
          ? (data.province?.trim() ? data.province.trim().toUpperCase() : null)
          : undefined,
        region: toNull(data.region),
        specialization: toNull(data.specialization),
        profession: toNull(data.profession),
        educationLevel: toNull(data.educationLevel),
        employerName: toNull(data.employerName),
        vatNumber: toNull(data.vatNumber),
        iban: toNull(data.iban),
        vatExempt: data.vatExempt ?? false,
        publicEmployee: data.publicEmployee ?? null,
        sdiCode: toNull(data.sdiCode),
        registrationNumber: toNull(data.registrationNumber),
        bio: toNull(data.bio),
        notes: toNull(data.notes),
      },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        mobile: true,
        fax: true,
        emailSecondary: true,
        pec: true,
        birthDate: true,
        birthPlace: true,
        birthProvince: true,
        gender: true,
        fiscalCode: true,
        address: true,
        city: true,
        postalCode: true,
        province: true,
        region: true,
        specialization: true,
        profession: true,
        educationLevel: true,
        employerName: true,
        vatNumber: true,
        iban: true,
        vatExempt: true,
        publicEmployee: true,
        sdiCode: true,
        registrationNumber: true,
        bio: true,
        notes: true,
      },
    });

    return NextResponse.json(teacherToJson(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[TEACHER_PROFILE_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
