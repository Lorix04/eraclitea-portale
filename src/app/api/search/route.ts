import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(
    request,
    z.object({
      q: z.string().min(2).optional(),
    })
  );
  if ("error" in validation) {
    return validation.error;
  }

  const query = validation.data.q?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ courses: [], employees: [], certificates: [], clients: [] });
  }

  const isAdmin = session.user.role === "ADMIN";
  const clientId = session.user.clientId ?? undefined;

  const courses = await prisma.course.findMany({
    where: {
      title: { contains: query, mode: "insensitive" },
      ...(isAdmin ? {} : { status: "PUBLISHED" }),
    },
    take: 5,
    select: { id: true, title: true, status: true },
  });

  const employees = await prisma.employee.findMany({
    where: {
      ...(isAdmin ? {} : { clientId }),
      OR: [
        { nome: { contains: query, mode: "insensitive" } },
        { cognome: { contains: query, mode: "insensitive" } },
        { codiceFiscale: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, nome: true, cognome: true, codiceFiscale: true },
  });

  const certificates = await prisma.certificate.findMany({
    where: {
      ...(isAdmin ? {} : { clientId }),
      OR: [
        { employee: { cognome: { contains: query, mode: "insensitive" } } },
        { course: { title: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 5,
    include: {
      employee: { select: { nome: true, cognome: true } },
      course: { select: { title: true } },
    },
  });

  const clients = isAdmin
    ? await prisma.client.findMany({
        where: {
          OR: [
            { ragioneSociale: { contains: query, mode: "insensitive" } },
            { piva: { contains: query } },
          ],
        },
        take: 5,
        select: { id: true, ragioneSociale: true, piva: true },
      })
    : [];

  return NextResponse.json({ courses, employees, certificates, clients });
}
