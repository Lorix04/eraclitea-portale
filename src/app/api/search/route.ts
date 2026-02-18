import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();

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

  const isAdmin = session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;
  const clientId = isAdmin
    ? session.user.clientId ?? undefined
    : effectiveClient?.clientId ?? session.user.clientId ?? undefined;

  if (!isAdmin && !clientId) {
    return NextResponse.json({ courses: [], employees: [], certificates: [], clients: [] });
  }

  let coursesPayload: Array<Record<string, unknown>> = [];
  if (isAdmin) {
    const courses = await prisma.course.findMany({
      where: {
        title: { contains: query, mode: Prisma.QueryMode.insensitive },
      },
      take: 5,
      select: { id: true, title: true },
    });
    coursesPayload = courses.map((course) => ({
      id: course.id,
      title: course.title,
      kind: "course",
    }));
  } else {
    const editions = await prisma.courseEdition.findMany({
      where: {
        clientId,
        course: { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
      },
      take: 5,
      select: {
        id: true,
        editionNumber: true,
        course: { select: { id: true, title: true } },
      },
    });
    coursesPayload = editions.map((edition) => ({
      id: edition.id,
      title: edition.course.title,
      editionNumber: edition.editionNumber,
      kind: "edition",
    }));
  }

  const employees = await prisma.employee.findMany({
    where: {
      ...(isAdmin ? {} : { clientId }),
      OR: [
        { nome: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { cognome: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { codiceFiscale: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ],
    },
    take: 5,
    select: { id: true, nome: true, cognome: true, codiceFiscale: true },
  });

  const certificates = await prisma.certificate.findMany({
    where: {
      ...(isAdmin ? {} : { clientId }),
      OR: [
        { employee: { cognome: { contains: query, mode: Prisma.QueryMode.insensitive } } },
        {
          courseEdition: {
            course: { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
          },
        },
      ],
    },
    take: 5,
    include: {
      employee: { select: { nome: true, cognome: true } },
      courseEdition: {
        select: {
          editionNumber: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  const clients = isAdmin
    ? await prisma.client.findMany({
        where: {
          OR: [
            { ragioneSociale: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { piva: { contains: query } },
          ],
        },
        take: 5,
        select: { id: true, ragioneSociale: true, piva: true },
      })
    : [];

  const certificatesPayload = certificates.map((cert) => ({
    id: cert.id,
    employee: cert.employee,
    courseEdition: cert.courseEdition
      ? {
          editionNumber: cert.courseEdition.editionNumber,
          course: cert.courseEdition.course,
        }
      : null,
  }));

  return NextResponse.json({
    courses: coursesPayload,
    employees,
    certificates: certificatesPayload,
    clients,
  });
}
