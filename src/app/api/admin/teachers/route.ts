import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { checkApiPermission } from "@/lib/permissions";

const querySchema = z.object({
  search: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  status: z.enum(["INACTIVE", "PENDING", "ONBOARDING", "ACTIVE", "SUSPENDED"]).optional(),
  categoryId: z.string().cuid().optional(),
  province: z.string().trim().min(1).max(10).optional(),
  region: z.string().trim().min(1).max(100).optional(),
  includeAssignments: z.enum(["true", "false"]).optional(),
  editionId: z.string().optional(),
});

const optStr = z.string().trim().max(200).optional().or(z.literal(""));

const teacherSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(100),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  province: z.string().trim().max(10).optional().or(z.literal("")),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  specialization: z.string().trim().max(150).optional().or(z.literal("")),
  categoryIds: z.array(z.string().cuid()).optional(),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  active: z.boolean().optional(),
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "view")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const {
      search,
      active,
      status,
      categoryId,
      province,
      region,
      includeAssignments,
      editionId,
    } =
      validation.data;
    const where: Prisma.TeacherWhereInput = {
      ...(active ? { active: active === "true" } : {}),
      ...(status ? { status } : {}),
      ...(province
        ? {
            province: {
              equals: province.toUpperCase(),
            },
          }
        : {}),
      ...(region
        ? {
            region: {
              equals: region,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(categoryId
        ? {
            categories: {
              some: {
                id: categoryId,
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { province: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { region: { contains: search, mode: Prisma.QueryMode.insensitive } },
              {
                categories: {
                  some: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
        _count: { select: { assignments: true } },
        cvDpr445: { select: { status: true } },
        assignments:
          includeAssignments === "true"
            ? {
                where: editionId
                  ? {
                      lesson: {
                        courseEditionId: editionId,
                      },
                    }
                  : undefined,
                include: {
                  lesson: {
                    select: {
                      id: true,
                      date: true,
                      startTime: true,
                      endTime: true,
                      title: true,
                      luogo: true,
                      courseEdition: {
                        select: {
                          id: true,
                          editionNumber: true,
                          status: true,
                          course: { select: { id: true, title: true } },
                          client: { select: { id: true, ragioneSociale: true } },
                        },
                      },
                    },
                  },
                },
                orderBy: { lesson: { date: "asc" } },
              }
            : false,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const enriched = teachers.map((t) => ({
      ...t,
      hasIntegrityIssue:
        (t.status === "ACTIVE" || t.status === "ONBOARDING") && !t.userId,
      integrityIssue:
        (t.status === "ACTIVE" || t.status === "ONBOARDING") && !t.userId
          ? "ACTIVE_WITHOUT_USER"
          : null,
    }));

    const integrityIssues = enriched.filter((t) => t.hasIntegrityIssue).length;

    return NextResponse.json({ data: enriched, integrityIssues });
  } catch (error) {
    console.error("[ADMIN_TEACHERS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "docenti", "create")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = await validateBody(request, teacherSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const data = validation.data;
    const n = (v: string | undefined | null) =>
      v && v.trim() ? v.trim() : null;

    // Check email uniqueness across User and Teacher tables
    const emailToCheck = data.email?.trim()?.toLowerCase();
    if (emailToCheck) {
      const existingUser = await prisma.user.findUnique({ where: { email: emailToCheck } });
      if (existingUser) {
        const roleLabel = existingUser.role === "ADMIN" ? "amministratore" : existingUser.role === "CLIENT" ? "cliente" : "docente";
        return NextResponse.json(
          { error: `Esiste già un ${roleLabel} con l'email ${emailToCheck}` },
          { status: 409 }
        );
      }
      const existingTeacher = await prisma.teacher.findFirst({ where: { email: emailToCheck } });
      if (existingTeacher) {
        return NextResponse.json(
          { error: `Esiste già un docente con l'email ${emailToCheck}` },
          { status: 409 }
        );
      }
    }

    const teacher = await prisma.teacher.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: n(data.email),
        phone: n(data.phone),
        province: data.province?.trim() ? data.province.trim().toUpperCase() : null,
        region: n(data.region),
        specialization: n(data.specialization),
        bio: n(data.bio),
        notes: n(data.notes),
        active: data.active ?? true,
        categories: data.categoryIds?.length
          ? { connect: data.categoryIds.map((id) => ({ id })) }
          : undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        birthPlace: n(data.birthPlace),
        birthProvince: data.birthProvince?.trim() ? data.birthProvince.trim().toUpperCase() : null,
        gender: data.gender || null,
        fiscalCode: data.fiscalCode?.trim() ? data.fiscalCode.trim().toUpperCase() : null,
        address: n(data.address),
        city: n(data.city),
        postalCode: n(data.postalCode),
        fax: n(data.fax),
        mobile: n(data.mobile),
        emailSecondary: n(data.emailSecondary),
        pec: n(data.pec),
        vatNumber: n(data.vatNumber),
        iban: n(data.iban),
        vatExempt: data.vatExempt ?? false,
        publicEmployee: data.publicEmployee ?? null,
        educationLevel: n(data.educationLevel),
        profession: n(data.profession),
        employerName: n(data.employerName),
        sdiCode: n(data.sdiCode) || "0000000",
        registrationNumber: n(data.registrationNumber),
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

    return NextResponse.json({ data: teacher }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_TEACHERS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
