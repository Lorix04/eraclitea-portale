import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { courseEditionSchema } from "@/lib/schemas";
import { deleteCertificateFile } from "@/lib/certificate-storage";

export async function GET(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    include: {
      course: { select: { id: true, title: true, durationHours: true } },
      client: { select: { id: true, ragioneSociale: true } },
      _count: { select: { registrations: true, lessons: true, certificates: true } },
    },
  });

  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  return NextResponse.json({ data: edition });
}

export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, courseEditionSchema.partial());
  if ("error" in validation) {
    return validation.error;
  }

  const existing = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: {
      id: true,
      courseId: true,
      clientId: true,
      editionNumber: true,
      course: { select: { title: true } },
    },
  });
  if (!existing || existing.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  const data = validation.data;

  const updated = await prisma.courseEdition.update({
    where: { id: context.params.edId },
    data: {
      clientId: data.clientId ?? undefined,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      deadlineRegistry: data.deadlineRegistry ?? undefined,
      status: data.status ?? undefined,
      notes: data.notes ?? undefined,
    },
    include: {
      course: { select: { id: true, title: true, durationHours: true } },
      client: { select: { id: true, ragioneSociale: true } },
    },
  });

  if (data.clientId && data.clientId !== existing.clientId) {
    await prisma.notification.create({
      data: {
        type: "COURSE_PUBLISHED",
        title: "Nuovo corso disponibile",
        message: `Sei stato aggiunto al corso ${updated.course.title} - Edizione #${updated.editionNumber}`,
        courseEditionId: updated.id,
        isGlobal: false,
      },
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: {
      id: true,
      courseId: true,
      _count: {
        select: {
          registrations: true,
          lessons: true,
          attendances: true,
          certificates: true,
        },
      },
    },
  });
  if (!existing || existing.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  const certificates = await prisma.certificate.findMany({
    where: { courseEditionId: context.params.edId },
    select: { id: true, filePath: true },
  });

  for (const cert of certificates) {
    try {
      await deleteCertificateFile(cert.filePath);
    } catch (error) {
      console.error("Errore eliminazione file attestato:", error);
    }
  }

  const notificationsCount = await prisma.notification.count({
    where: { courseEditionId: context.params.edId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: { courseEditionId: context.params.edId },
    });
    await tx.courseEdition.delete({
      where: { id: context.params.edId },
    });
  });

  return NextResponse.json({
    success: true,
    deleted: {
      registrations: existing._count.registrations,
      lessons: existing._count.lessons,
      attendances: existing._count.attendances,
      certificates: existing._count.certificates,
      notifications: notificationsCount,
    },
  });
}
