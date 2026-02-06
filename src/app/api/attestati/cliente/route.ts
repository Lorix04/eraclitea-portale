import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";

const filterSchema = z.object({
  courseId: z.string().cuid().optional(),
  employeeId: z.string().cuid().optional(),
  year: z.coerce.number().min(2000).max(2100).optional(),
  status: z.enum(["valid", "expiring", "expired"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const validation = validateQuery(request, filterSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { courseId, employeeId, year, status, page, limit } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const clientId = session.user.clientId;

  const where: Record<string, unknown> = {
    clientId,
    ...(courseId ? { courseId } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  if (year) {
    const from = new Date(Number(year), 0, 1);
    const to = new Date(Number(year) + 1, 0, 1);
    where.uploadedAt = { gte: from, lt: to };
  }

  const now = new Date();
  const expiringDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (status === "expired") {
    where.expiresAt = { lt: now };
  } else if (status === "expiring") {
    where.expiresAt = { gte: now, lte: expiringDate };
  } else if (status === "valid") {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: expiringDate } },
    ];
  }

  const [certificates, total, expiringCount] = await prisma.$transaction([
    prisma.certificate.findMany({
      where,
      include: {
        employee: { select: { id: true, nome: true, cognome: true } },
        course: { select: { id: true, title: true } },
        uploader: { select: { email: true } },
      },
      orderBy: { uploadedAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.certificate.count({ where }),
    prisma.certificate.count({
      where: {
        clientId,
        expiresAt: { gte: now, lte: expiringDate },
      },
    }),
  ]);

  const data = certificates.map((cert) => ({
    id: cert.id,
    employee: cert.employee,
    course: cert.course ?? null,
    achievedAt: cert.achievedAt,
    expiresAt: cert.expiresAt,
    uploadedAt: cert.uploadedAt,
    uploadedByEmail: cert.uploader?.email ?? null,
  }));

  return NextResponse.json({
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    expiringCount,
  });
}
