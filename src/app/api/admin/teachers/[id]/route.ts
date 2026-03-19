import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { deleteTeacherCv } from "@/lib/teacher-cv-storage";

const optStr = z.string().trim().max(200).optional().or(z.literal(""));

const teacherUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(100).optional(),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(100).optional(),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  province: z.string().trim().max(10).optional().or(z.literal("")),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  specialization: z.string().trim().max(150).optional().or(z.literal("")),
  categoryIds: z.array(z.string().cuid()).optional(),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  active: z.boolean().optional(),
  status: z.enum(["INACTIVE", "PENDING", "ONBOARDING", "ACTIVE", "SUSPENDED"]).optional(),
  // New fields
  birthDate: z.string().optional().or(z.literal("")),
  birthPlace: optStr,
  birthProvince: z.string().trim().max(10).optional().or(z.literal("")),
  gender: z.enum(["M", "F"]).optional().nullable(),
  fiscalCode: z.string().trim().max(16).optional().or(z.literal("")),
  address: optStr,
  city: optStr,
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  fax: z.string().trim().max(50).optional().or(z.literal("")),
  mobile: z.string().trim().max(50).optional().or(z.literal("")),
  emailSecondary: z.string().trim().email().optional().or(z.literal("")),
  pec: z.string().trim().email().optional().or(z.literal("")),
  vatNumber: z.string().trim().max(20).optional().or(z.literal("")),
  iban: z.string().trim().max(34).optional().or(z.literal("")),
  vatExempt: z.boolean().optional(),
  publicEmployee: z.boolean().optional().nullable(),
  educationLevel: z.string().trim().max(100).optional().or(z.literal("")),
  profession: optStr,
  employerName: optStr,
  sdiCode: z.string().trim().max(20).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(50).optional().or(z.literal("")),
});

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
        assignments: {
          include: {
            lesson: {
              include: {
                courseEdition: {
                  include: {
                    course: { select: { id: true, title: true } },
                    client: { select: { id: true, ragioneSociale: true } },
                  },
                },
              },
            },
          },
          orderBy: { lesson: { date: "asc" } },
        },
        unavailabilities: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
        signedDocuments: {
          select: {
            id: true,
            documentType: true,
            declaration1: true,
            declaration2: true,
            declaration3: true,
            declaration4: true,
            declaration5: true,
            signedAt: true,
            signedFromIp: true,
            pdfPath: true,
          },
          orderBy: { signedAt: "desc" },
        },
        _count: { select: { assignments: true, unavailabilities: true } },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    return NextResponse.json({ data: teacher });
  } catch (error) {
    console.error("[ADMIN_TEACHER_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = await validateBody(request, teacherUpdateSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const existing = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const data = validation.data;
    const toNull = (v: string | undefined | null) =>
      v !== undefined ? (typeof v === "string" && v.trim() ? v.trim() : null) : undefined;
    const toUpperNull = (v: string | undefined | null) =>
      v !== undefined ? (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : null) : undefined;

    const teacher = await prisma.teacher.update({
      where: { id: context.params.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: toNull(data.email),
        phone: toNull(data.phone),
        province: toUpperNull(data.province),
        region: toNull(data.region),
        specialization: toNull(data.specialization),
        categories:
          data.categoryIds !== undefined
            ? {
                set: data.categoryIds.map((categoryId) => ({ id: categoryId })),
              }
            : undefined,
        bio: toNull(data.bio),
        notes: toNull(data.notes),
        active: data.active,
        status: data.status,
        // New fields
        birthDate: data.birthDate !== undefined
          ? (data.birthDate ? new Date(data.birthDate) : null)
          : undefined,
        birthPlace: toNull(data.birthPlace),
        birthProvince: toUpperNull(data.birthProvince),
        gender: data.gender !== undefined ? (data.gender || null) : undefined,
        fiscalCode: toUpperNull(data.fiscalCode),
        address: toNull(data.address),
        city: toNull(data.city),
        postalCode: toNull(data.postalCode),
        fax: toNull(data.fax),
        mobile: toNull(data.mobile),
        emailSecondary: toNull(data.emailSecondary),
        pec: toNull(data.pec),
        vatNumber: toNull(data.vatNumber),
        iban: toNull(data.iban),
        vatExempt: data.vatExempt,
        publicEmployee: data.publicEmployee !== undefined ? data.publicEmployee : undefined,
        educationLevel: toNull(data.educationLevel),
        profession: toNull(data.profession),
        employerName: toNull(data.employerName),
        sdiCode: toNull(data.sdiCode),
        registrationNumber: toNull(data.registrationNumber),
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json({ data: teacher });
  } catch (error) {
    console.error("[ADMIN_TEACHER_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.teacher.findUnique({
      where: { id: context.params.id },
      select: { id: true, cvPath: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    await deleteTeacherCv(existing.cvPath);
    await prisma.teacher.delete({ where: { id: context.params.id } });

    // Clean up linked User (TEACHER role) to avoid orphan accounts
    if (existing.userId) {
      await prisma.user.delete({ where: { id: existing.userId } }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_TEACHER_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
