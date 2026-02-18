import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";

const querySchema = z.object({
  editionId: z.string().cuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  categoryId: z.string().cuid().optional(),
  search: z.string().trim().optional(),
});

type StoricoListItem = {
  id: string;
  courseTitle: string;
  editionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  completedAt: Date;
  startDate: Date | null;
  endDate: Date | null;
  totalParticipants: number;
  certificatesIssued: number;
  certificateIds: string[];
  categories: Array<{ id: string; name: string; color?: string | null }>;
};

function getEditionYear(date: Date) {
  return date.getFullYear();
}

function getReferenceDate(edition: {
  endDate: Date | null;
  startDate: Date | null;
  updatedAt: Date;
}) {
  return edition.endDate ?? edition.startDate ?? edition.updatedAt;
}

async function getEditionDetail(clientId: string, editionId: string) {
  const edition = await prisma.courseEdition.findFirst({
    where: {
      id: editionId,
      clientId,
      status: { in: ["CLOSED", "ARCHIVED", "PUBLISHED"] },
    },
    select: {
      id: true,
      editionNumber: true,
      status: true,
      course: { select: { title: true } },
      registrations: {
        select: {
          employeeId: true,
          employee: {
            select: {
              nome: true,
              cognome: true,
              codiceFiscale: true,
            },
          },
        },
      },
      lessons: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  const lessonIds = edition.lessons.map((lesson) => lesson.id);
  const employeeIds = edition.registrations.map((registration) => registration.employeeId);

  const [attendances, certificates] = await Promise.all([
    lessonIds.length && employeeIds.length
      ? prisma.attendance.findMany({
          where: {
            lessonId: { in: lessonIds },
            employeeId: { in: employeeIds },
          },
          select: {
            lessonId: true,
            employeeId: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    employeeIds.length
      ? prisma.certificate.findMany({
          where: {
            clientId,
            courseEditionId: edition.id,
            employeeId: { in: employeeIds },
          },
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            employeeId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const attendanceMap = new Map<string, { presentEquivalent: number; total: number }>();

  for (const attendance of attendances) {
    const key = attendance.employeeId;
    const current = attendanceMap.get(key) ?? { presentEquivalent: 0, total: 0 };
    current.total += 1;
    if (attendance.status === "PRESENT" || attendance.status === "ABSENT_JUSTIFIED") {
      current.presentEquivalent += 1;
    }
    attendanceMap.set(key, current);
  }

  const certificateByEmployee = new Map<string, string>();
  for (const certificate of certificates) {
    if (!certificateByEmployee.has(certificate.employeeId)) {
      certificateByEmployee.set(certificate.employeeId, certificate.id);
    }
  }

  const registrations = edition.registrations.map((registration) => {
    const attendance = attendanceMap.get(registration.employeeId) ?? {
      presentEquivalent: 0,
      total: edition.lessons.length,
    };

    const totalLessons = edition.lessons.length;
    const presentEquivalent = attendance.presentEquivalent;
    const attendanceRate =
      totalLessons > 0 ? Math.round((presentEquivalent / totalLessons) * 100) : 0;

    const certificateId = certificateByEmployee.get(registration.employeeId) ?? null;

    return {
      employeeId: registration.employeeId,
      firstName: registration.employee.nome,
      lastName: registration.employee.cognome,
      fiscalCode: registration.employee.codiceFiscale,
      attendanceRate,
      attendanceSummary: `${presentEquivalent}/${totalLessons} (${attendanceRate}%)`,
      certificateId,
      certificateUrl: certificateId ? `/api/attestati/${certificateId}/download` : null,
    };
  });

  const averageAttendance = registrations.length
    ? Math.round(
        registrations.reduce((acc, item) => acc + item.attendanceRate, 0) /
          registrations.length
      )
    : 0;

  const certificatesIssued = registrations.filter((item) => item.certificateId).length;

  return NextResponse.json({
    edition: {
      id: edition.id,
      title: `${edition.course.title} (Ed. #${edition.editionNumber})`,
      status: edition.status,
    },
    registrations,
    summary: {
      totalParticipants: registrations.length,
      averageAttendance,
      certificatesIssued,
      certificatesTotal: registrations.length,
    },
  });
}

export async function GET(request: Request) {
  const context = await getEffectiveClientContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { editionId, year, categoryId, search } = validation.data;
  const clientId = context.clientId;

  if (editionId) {
    return getEditionDetail(clientId, editionId);
  }

  const andFilters: Prisma.CourseEditionWhereInput[] = [
    {
      clientId,
      status: { in: ["CLOSED", "ARCHIVED"] },
    },
  ];

  if (search) {
    andFilters.push({
      course: {
        title: { contains: search, mode: Prisma.QueryMode.insensitive },
      },
    });
  }

  if (categoryId) {
    andFilters.push({
      course: {
        categories: { some: { categoryId } },
      },
    });
  }

  if (year) {
    const from = new Date(year, 0, 1, 0, 0, 0, 0);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    andFilters.push({
      OR: [
        { endDate: { gte: from, lte: to } },
        { startDate: { gte: from, lte: to } },
        { updatedAt: { gte: from, lte: to } },
      ],
    });
  }

  const where: Prisma.CourseEditionWhereInput = { AND: andFilters };

  const [editions, allClosedEditions] = await Promise.all([
    prisma.courseEdition.findMany({
      where,
      select: {
        id: true,
        editionNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
        course: {
          select: {
            title: true,
            categories: {
              select: {
                category: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.courseEdition.findMany({
      where: {
        clientId,
        status: { in: ["CLOSED", "ARCHIVED"] },
      },
      select: {
        startDate: true,
        endDate: true,
        updatedAt: true,
        course: {
          select: {
            categories: {
              select: {
                category: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const editionIds = editions.map((edition) => edition.id);

  const [certificates, certificateCountByEdition] = await Promise.all([
    editionIds.length
      ? prisma.certificate.findMany({
          where: {
            clientId,
            courseEditionId: { in: editionIds },
          },
          select: {
            id: true,
            courseEditionId: true,
          },
        })
      : Promise.resolve([]),
    editionIds.length
      ? prisma.certificate.groupBy({
          by: ["courseEditionId"],
          where: {
            clientId,
            courseEditionId: { in: editionIds },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const certificateIdsMap = new Map<string, string[]>();
  for (const certificate of certificates) {
    if (!certificate.courseEditionId) continue;
    const list = certificateIdsMap.get(certificate.courseEditionId) ?? [];
    list.push(certificate.id);
    certificateIdsMap.set(certificate.courseEditionId, list);
  }

  const certificateCountMap = new Map<string, number>();
  for (const item of certificateCountByEdition) {
    if (!item.courseEditionId) continue;
    certificateCountMap.set(item.courseEditionId, item._count._all);
  }

  const list: StoricoListItem[] = editions.map((edition) => {
    const referenceDate = getReferenceDate(edition);
    const categories = edition.course.categories.map((entry) => ({
      id: entry.category.id,
      name: entry.category.name,
      color: entry.category.color,
    }));

    return {
      id: edition.id,
      courseTitle: edition.course.title,
      editionNumber: edition.editionNumber,
      status: edition.status,
      completedAt: referenceDate,
      startDate: edition.startDate,
      endDate: edition.endDate,
      totalParticipants: edition._count.registrations,
      certificatesIssued: certificateCountMap.get(edition.id) ?? 0,
      certificateIds: certificateIdsMap.get(edition.id) ?? [],
      categories,
    };
  });

  const grouped = new Map<number, StoricoListItem[]>();
  for (const item of list) {
    const yearKey = getEditionYear(item.completedAt);
    const yearItems = grouped.get(yearKey) ?? [];
    yearItems.push(item);
    grouped.set(yearKey, yearItems);
  }

  const data = Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([groupYear, courses]) => ({
      year: groupYear,
      courses: courses.sort(
        (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
      ),
    }));

  const years = new Set<number>();
  const categories = new Map<string, { id: string; name: string; color?: string | null }>();
  for (const edition of allClosedEditions) {
    years.add(getEditionYear(getReferenceDate(edition)));
    for (const entry of edition.course.categories) {
      categories.set(entry.category.id, {
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color,
      });
    }
  }

  const totalParticipants = list.reduce(
    (acc, item) => acc + item.totalParticipants,
    0
  );
  const totalCertificates = list.reduce(
    (acc, item) => acc + item.certificatesIssued,
    0
  );

  return NextResponse.json({
    data,
    summary: {
      totalCourses: list.length,
      totalParticipants,
      totalCertificates,
    },
    filters: {
      years: Array.from(years).sort((a, b) => b - a),
      categories: Array.from(categories.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "it")
      ),
    },
  });
}
