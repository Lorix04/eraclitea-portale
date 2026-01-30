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

  const registrations = await prisma.courseRegistration.findMany({
    where: { clientId: session.user.clientId, status: "TRAINED" },
    include: { course: true },
    orderBy: { updatedAt: "desc" },
  });

  const courseIds = Array.from(new Set(registrations.map((reg) => reg.courseId)));
  const certificates = await prisma.certificate.findMany({
    where: { clientId: session.user.clientId, courseId: { in: courseIds } },
    select: { id: true, courseId: true },
  });
  const certMap = new Map<string, string[]>();
  certificates.forEach((cert) => {
    const list = certMap.get(cert.courseId) ?? [];
    list.push(cert.id);
    certMap.set(cert.courseId, list);
  });

  const grouped = new Map<
    number,
    Array<{
      id: string;
      title: string;
      completedAt: Date;
      totalTrained: number;
      certificateIds: string[];
    }>
  >();

  const courseCounts = new Map<string, number>();

  registrations.forEach((reg) => {
    const year = reg.updatedAt.getFullYear();
    const current = grouped.get(year) ?? [];
    const key = `${year}-${reg.courseId}`;
    const count = (courseCounts.get(key) ?? 0) + 1;
    courseCounts.set(key, count);

    const existing = current.find((item) => item.id === reg.courseId);
    if (existing) {
      existing.totalTrained = count;
    } else {
      current.push({
        id: reg.courseId,
        title: reg.course.title,
        completedAt: reg.updatedAt,
        totalTrained: count,
        certificateIds: certMap.get(reg.courseId) ?? [],
      });
    }

    grouped.set(year, current);
  });

  const data = Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, courses]) => ({ year, courses }));

  return NextResponse.json({ data });
}
