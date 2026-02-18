import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";
import {
  sendAdminRegistrySubmittedEmail,
  sendRegistryReceivedEmail,
} from "@/lib/email-notifications";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT" || !session.user.clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      clientId: true,
      status: true,
      deadlineRegistry: true,
      editionNumber: true,
      course: { select: { title: true } },
    },
  });

  if (!edition || edition.clientId !== session.user.clientId) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (edition.status === "CLOSED" || edition.status === "ARCHIVED") {
    return NextResponse.json(
      {
        error:
          "Le anagrafiche non possono essere inviate: l'edizione e chiusa.",
      },
      { status: 403 }
    );
  }

  if (edition.status !== "PUBLISHED") {
    return NextResponse.json(
      {
        error:
          "Le anagrafiche non possono essere inviate: l'edizione non e aperta.",
      },
      { status: 403 }
    );
  }

  if (edition.deadlineRegistry && new Date() > edition.deadlineRegistry) {
    return NextResponse.json(
      {
        error:
          "Le anagrafiche non possono essere inviate: la deadline e scaduta.",
      },
      { status: 403 }
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

  try {
    await prisma.notification.create({
      data: {
        type: "REGISTRY_RECEIVED",
        title: `Anagrafiche ricevute da ${client?.ragioneSociale ?? "Cliente"}`,
        message: `${client?.ragioneSociale ?? "Cliente"} ha inviato le anagrafiche per ${edition.course.title} (Ed. #${edition.editionNumber}).`,
        courseEditionId: edition.id,
        isGlobal: false,
      },
    });
  } catch (error) {
    console.error("Errore creazione notifica REGISTRY_RECEIVED:", error);
  }

  if (client?.referenteEmail) {
    void sendRegistryReceivedEmail({
      clientEmail: client.referenteEmail,
      clientName: client.referenteNome || client.ragioneSociale,
      clientId: client.id,
      courseName: edition.course.title,
      editionNumber: edition.editionNumber,
      employeeCount: registrations.length,
      courseEditionId: edition.id,
    });
  }

  await Promise.all(
    admins.map((admin) =>
      sendAdminRegistrySubmittedEmail({
        adminEmail: admin.email,
        adminName: admin.email,
        adminId: admin.id,
        clientName: client?.ragioneSociale ?? "Cliente",
        courseName: edition.course.title,
        editionNumber: edition.editionNumber,
        employeeCount: registrations.length,
        courseEditionId: edition.id,
      })
    )
  );

  return NextResponse.json({
    success: true,
    submittedCount: registrations.length,
  });
}
