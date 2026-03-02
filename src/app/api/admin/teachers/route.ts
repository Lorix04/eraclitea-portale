import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";

const querySchema = z.object({
  search: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  categoryId: z.string().cuid().optional(),
  includeAssignments: z.enum(["true", "false"]).optional(),
  editionId: z.string().optional(),
});

const teacherSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(100),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  specialization: z.string().trim().max(150).optional().or(z.literal("")),
  categoryIds: z.array(z.string().cuid()).optional(),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const { search, active, categoryId, includeAssignments, editionId } =
      validation.data;
    const where: Prisma.TeacherWhereInput = {
      ...(active ? { active: active === "true" } : {}),
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

    return NextResponse.json({ data: teachers });
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

    const validation = await validateBody(request, teacherSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const data = validation.data;

    const teacher = await prisma.teacher.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email?.trim() ? data.email.trim() : null,
        phone: data.phone?.trim() ? data.phone.trim() : null,
        specialization: data.specialization?.trim() ? data.specialization.trim() : null,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        notes: data.notes?.trim() ? data.notes.trim() : null,
        active: data.active ?? true,
        categories: data.categoryIds?.length
          ? {
              connect: data.categoryIds.map((id) => ({ id })),
            }
          : undefined,
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
