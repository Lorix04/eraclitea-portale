import { NextResponse } from "next/server";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const context = await getEffectiveClientContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = context.clientId;
  const now = new Date();

  const [
    activeEditions,
    totalEmployees,
    validCertificates,
    attendanceTotal,
    attendancePresentOrJustified,
    registryDeadlines,
    expiringCertificates,
    recentEditions,
  ] = await Promise.all([
    prisma.courseEdition.count({
      where: { clientId, status: "PUBLISHED" },
    }),
    prisma.employee.count({
      where: { clientId },
    }),
    prisma.certificate.count({
      where: {
        clientId,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    }),
    prisma.attendance.count({
      where: {
        courseEdition: { clientId },
      },
    }),
    prisma.attendance.count({
      where: {
        courseEdition: { clientId },
        OR: [{ status: "PRESENT" }, { status: "ABSENT_JUSTIFIED" }],
      },
    }),
    prisma.courseEdition.findMany({
      where: {
        clientId,
        status: "PUBLISHED",
        deadlineRegistry: { gte: now },
      },
      select: {
        id: true,
        editionNumber: true,
        deadlineRegistry: true,
        course: { select: { title: true } },
      },
      orderBy: { deadlineRegistry: "asc" },
      take: 5,
    }),
    prisma.certificate.findMany({
      where: {
        clientId,
        expiresAt: { gte: now },
      },
      select: {
        id: true,
        expiresAt: true,
        employee: { select: { nome: true, cognome: true } },
        courseEdition: {
          select: {
            id: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { expiresAt: "asc" },
      take: 5,
    }),
    prisma.courseEdition.findMany({
      where: {
        clientId,
        status: { in: ["PUBLISHED", "CLOSED", "ARCHIVED"] },
      },
      select: {
        id: true,
        editionNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        deadlineRegistry: true,
        course: { select: { title: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const averageAttendance =
    attendanceTotal > 0
      ? Math.round((attendancePresentOrJustified / attendanceTotal) * 100)
      : 0;

  const upcomingDeadlines = [
    ...registryDeadlines.map((edition) => ({
      type: "registry_deadline" as const,
      courseTitle: edition.course.title,
      editionNumber: edition.editionNumber,
      date: edition.deadlineRegistry?.toISOString() ?? null,
      editionId: edition.id,
    })),
    ...expiringCertificates
      .filter((cert) => cert.expiresAt)
      .map((cert) => ({
        type: "certificate_expiring" as const,
        employeeName: `${cert.employee.cognome} ${cert.employee.nome}`.trim(),
        courseTitle: cert.courseEdition?.course?.title || "Corso",
        date: cert.expiresAt?.toISOString() ?? null,
        certificateId: cert.id,
      })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 5);

  return NextResponse.json({
    stats: {
      activeEditions,
      totalEmployees,
      validCertificates,
      averageAttendance,
    },
    upcomingDeadlines,
    recentEditions: recentEditions.map((edition) => ({
      id: edition.id,
      courseTitle: edition.course.title,
      editionNumber: edition.editionNumber,
      startDate: edition.startDate,
      endDate: edition.endDate,
      status: edition.status,
      registrationCount: edition._count.registrations,
      deadlineRegistry: edition.deadlineRegistry,
    })),
  });
}
