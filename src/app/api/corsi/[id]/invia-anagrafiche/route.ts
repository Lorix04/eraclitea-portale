import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import { registrySubmittedTemplate } from "@/lib/email-templates";
import { getClientIP, logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
      status: "PUBLISHED",
      OR: [
        { deadlineRegistry: null },
        { deadlineRegistry: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      editionNumber: true,
      course: { select: { title: true } },
    },
  });

  if (!edition) {
    return NextResponse.json(
      { error: "Edizione non disponibile o deadline superata" },
      { status: 400 }
    );
  }

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseEditionId: params.id,
      clientId: session.user.clientId,
      status: "INSERTED",
    },
    include: { employee: true },
  });

  if (registrations.length === 0) {
    return NextResponse.json(
      { error: "Nessuna anagrafica da inviare" },
      { status: 400 }
    );
  }

  const invalidEmployees = registrations.filter(
    (reg) =>
      !reg.employee.nome ||
      !reg.employee.cognome ||
      !reg.employee.codiceFiscale ||
      !reg.employee.dataNascita ||
      !reg.employee.luogoNascita
  );

  if (invalidEmployees.length > 0) {
    return NextResponse.json(
      {
        error: "Alcuni dipendenti hanno dati incompleti",
        invalidCount: invalidEmployees.length,
        invalidIds: invalidEmployees.map((reg) => reg.employeeId),
      },
      { status: 400 }
    );
  }

  await prisma.courseRegistration.updateMany({
    where: {
      courseEditionId: params.id,
      clientId: session.user.clientId,
      status: "INSERTED",
    },
    data: { status: "CONFIRMED" },
  });

  await logAudit({
    userId: session.user.id,
    action: "REGISTRY_SUBMIT",
    entityType: "CourseEdition",
    entityId: params.id,
    ipAddress: getClientIP(request),
  });

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
  });
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
  });

  await Promise.all(
    admins.map((admin) =>
      send({
        to: admin.email,
        subject: `Anagrafiche ricevute: ${edition.course.title} (Ed. #${edition.editionNumber})`,
        html: registrySubmittedTemplate(
          client?.ragioneSociale ?? "Cliente",
          `${edition.course.title} (Ed. #${edition.editionNumber})`,
          registrations.length
        ),
      })
    )
  );

  return NextResponse.json({
    success: true,
    submittedCount: registrations.length,
  });
}
