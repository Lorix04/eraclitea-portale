import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalClients,
    activeClients,
    totalCourses,
    publishedCourses,
    totalEditions,
    activeEditions,
    totalEmployees,
    totalCertificates,
    pendingRegistrations,
    coursesNearDeadline,
    expiringCertificates,
    recentActivity,
    recentRegistrations,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.course.count(),
    prisma.courseEdition.count({ where: { status: "PUBLISHED" } }),
    prisma.courseEdition.count(),
    prisma.courseEdition.count({
      where: { status: { in: ["PUBLISHED"] } },
    }),
    prisma.employee.count(),
    prisma.certificate.count(),
    prisma.courseRegistration.count({ where: { status: "CONFIRMED" } }),
    prisma.courseEdition.count({
      where: {
        status: "PUBLISHED",
        deadlineRegistry: { gte: now, lte: weekFromNow },
      },
    }),
    prisma.certificate.count({
      where: { expiresAt: { gte: now, lte: monthFromNow } },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.courseRegistration.findMany({
      where: { status: "CONFIRMED" },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { ragioneSociale: true } },
        courseEdition: {
          select: {
            editionNumber: true,
            course: { select: { title: true } },
          },
        },
        employee: { select: { nome: true, cognome: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totalClients,
    activeClients,
    totalCourses,
    publishedCourses,
    totalEditions,
    activeEditions,
    totalEmployees,
    totalCertificates,
    pendingRegistrations,
    coursesNearDeadline,
    expiringCertificates,
    recentActivity,
    recentRegistrations,
  });
}
