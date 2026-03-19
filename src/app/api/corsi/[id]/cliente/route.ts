import { NextResponse } from "next/server";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const effectiveClient = await getEffectiveClientContext();
  if (!effectiveClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.id },
    include: {
      course: {
        include: { categories: { include: { category: true } } },
      },
      lessons: {
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          durationHours: true,
          title: true,
          luogo: true,
        },
      },
      registrations: {
        include: { employee: true },
      },
    },
  });

  if (!edition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (edition.clientId !== effectiveClient.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (edition.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const certificates = await prisma.certificate.findMany({
    where: {
      courseEditionId: edition.id,
      clientId: effectiveClient.clientId,
    },
    include: {
      employee: { select: { nome: true, cognome: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const total = edition.registrations.length;
  const completed = edition.registrations.filter(
    (reg) => reg.status === "TRAINED"
  ).length;
  const luoghiUnici = Array.from(
    new Set(
      (edition.lessons ?? [])
        .map((lesson) => lesson.luogo?.trim())
        .filter((luogo): luogo is string => Boolean(luogo))
    )
  );

  return NextResponse.json({
    data: {
      id: edition.id,
      courseId: edition.courseId,
      editionNumber: edition.editionNumber,
      clientId: edition.clientId,
      status: edition.status,
      startDate: edition.startDate,
      endDate: edition.endDate,
      deadlineRegistry: edition.deadlineRegistry,
      presenzaMinimaType: edition.presenzaMinimaType,
      presenzaMinimaValue: edition.presenzaMinimaValue,
      notes: edition.notes,
      title: edition.course.title,
      categories: edition.course.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color,
      })),
      durationHours: edition.course.durationHours,
      description: edition.course.description,
      luoghi: luoghiUnici,
      lessons: edition.lessons.map((lesson) => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        durationHours: lesson.durationHours,
        title: lesson.title,
        luogo: lesson.luogo,
      })),
      registrations: edition.registrations.map((reg) => ({
        id: reg.id,
        status: reg.status,
        updatedAt: reg.updatedAt,
        employee: {
          id: reg.employee.id,
          nome: reg.employee.nome,
          cognome: reg.employee.cognome,
          codiceFiscale: reg.employee.codiceFiscale,
          sesso: reg.employee.sesso,
          dataNascita: reg.employee.dataNascita,
          luogoNascita: reg.employee.luogoNascita,
          email: reg.employee.email,
          telefono: reg.employee.telefono,
          cellulare: reg.employee.cellulare,
          indirizzo: reg.employee.indirizzo,
          comuneResidenza: reg.employee.comuneResidenza,
          cap: reg.employee.cap,
          provincia: reg.employee.provincia,
          regione: reg.employee.regione,
          emailAziendale: reg.employee.emailAziendale,
          partitaIva: reg.employee.partitaIva,
          iban: reg.employee.iban,
          pec: reg.employee.pec,
          mansione: reg.employee.mansione,
          note: reg.employee.note,
        },
      })),
      certificates: certificates.map((cert) => ({
        id: cert.id,
        employeeName: `${cert.employee.cognome} ${cert.employee.nome}`,
        uploadedAt: cert.uploadedAt,
      })),
      progress: {
        total,
        completed,
      },
    },
  });
}
