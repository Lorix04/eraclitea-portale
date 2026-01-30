import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const now = new Date();
  const expiringDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalEmployees,
    totalCertificates,
    pendingRegistrations,
    expiringCerts,
    completedCourses,
  ] = await Promise.all([
    prisma.employee.count({ where: { clientId: session.user.clientId } }),
    prisma.certificate.count({ where: { clientId: session.user.clientId } }),
    prisma.courseRegistration.count({
      where: { clientId: session.user.clientId, status: "INSERTED" },
    }),
    prisma.certificate.count({
      where: {
        clientId: session.user.clientId,
        expiresAt: { gte: now, lte: expiringDate },
      },
    }),
    prisma.courseRegistration.findMany({
      where: { clientId: session.user.clientId, status: "TRAINED" },
      distinct: ["courseId"],
      select: { courseId: true },
    }),
  ]);

  return NextResponse.json({
    totalEmployees,
    totalCertificates,
    coursesCompleted: completedCourses.length,
    expiringCerts,
    pendingRegistrations,
  });
}
