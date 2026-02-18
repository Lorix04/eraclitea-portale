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

  return NextResponse.json({
    data: {
      id: edition.id,
      editionNumber: edition.editionNumber,
      clientId: edition.clientId,
      status: edition.status,
      startDate: edition.startDate,
      endDate: edition.endDate,
      deadlineRegistry: edition.deadlineRegistry,
      notes: edition.notes,
      title: edition.course.title,
      categories: edition.course.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color,
      })),
      durationHours: edition.course.durationHours,
      description: edition.course.description,
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
