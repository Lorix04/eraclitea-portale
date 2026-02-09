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
    include: { courseEdition: { include: { course: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const editionIds = Array.from(
    new Set(registrations.map((reg) => reg.courseEditionId))
  );
  const certificates = await prisma.certificate.findMany({
    where: {
      clientId: session.user.clientId,
      courseEditionId: { in: editionIds },
    },
    select: { id: true, courseEditionId: true },
  });
  const certMap = new Map<string, string[]>();
  certificates.forEach((cert) => {
    if (!cert.courseEditionId) {
      return;
    }
    const list = certMap.get(cert.courseEditionId) ?? [];
    list.push(cert.id);
    certMap.set(cert.courseEditionId, list);
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
    const edition = reg.courseEdition;
    const year = reg.updatedAt.getFullYear();
    const current = grouped.get(year) ?? [];
    const key = `${year}-${reg.courseEditionId}`;
    const count = (courseCounts.get(key) ?? 0) + 1;
    courseCounts.set(key, count);

    const existing = current.find((item) => item.id === reg.courseEditionId);
    if (existing) {
      existing.totalTrained = count;
    } else {
      current.push({
        id: reg.courseEditionId,
        title: `${edition.course.title} (Ed. #${edition.editionNumber})`,
        completedAt: reg.updatedAt,
        totalTrained: count,
        certificateIds: certMap.get(reg.courseEditionId) ?? [],
      });
    }

    grouped.set(year, current);
  });

  const data = Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, courses]) => ({ year, courses }));

  return NextResponse.json({ data });
}
