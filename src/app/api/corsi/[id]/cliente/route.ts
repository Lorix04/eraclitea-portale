import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    include: {
      visibility: true,
      visibilityCategories: true,
      categories: { include: { category: true } },
      registrations: {
        where: { clientId: session.user.clientId },
        include: { employee: true },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId: session.user.clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = new Set(
    clientCategories.map((entry) => entry.categoryId)
  );

  const isVisible =
    (course.visibilityType === "ALL" && course.visibility.length === 0) ||
    (course.visibilityType === "SELECTED_CLIENTS" &&
      course.visibility.some(
        (entry) => entry.clientId === session.user.clientId
      )) ||
    (course.visibilityType === "BY_CATEGORY" &&
      course.visibilityCategories.some((entry) =>
        clientCategoryIds.has(entry.categoryId)
      )) ||
    // Compatibilita per corsi creati prima del campo visibilityType
    course.visibility.some((entry) => entry.clientId === session.user.clientId);

  if (!isVisible) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const certificates = await prisma.certificate.findMany({
    where: {
      courseId: course.id,
      clientId: session.user.clientId,
    },
    include: {
      employee: { select: { nome: true, cognome: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const total = course.registrations.length;
  const completed = course.registrations.filter(
    (reg) => reg.status === "TRAINED"
  ).length;

  return NextResponse.json({
    data: {
      id: course.id,
      title: course.title,
      categories: course.categories.map((entry) => ({
        id: entry.category.id,
        name: entry.category.name,
        color: entry.category.color,
      })),
      durationHours: course.durationHours,
      description: course.description,
      dateStart: course.dateStart,
      dateEnd: course.dateEnd,
      deadlineRegistry: course.deadlineRegistry,
      registrations: course.registrations.map((reg) => ({
        id: reg.id,
        status: reg.status,
        employee: {
          id: reg.employee.id,
          nome: reg.employee.nome,
          cognome: reg.employee.cognome,
          codiceFiscale: reg.employee.codiceFiscale,
          dataNascita: reg.employee.dataNascita,
          luogoNascita: reg.employee.luogoNascita,
          email: reg.employee.email,
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
