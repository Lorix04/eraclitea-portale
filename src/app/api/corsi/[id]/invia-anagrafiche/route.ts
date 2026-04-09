import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";
import { getEffectiveClientContext } from "@/lib/impersonate";
import {
  sendAdminRegistrySubmittedEmail,
  sendRegistryReceivedEmail,
} from "@/lib/email-notifications";
import { notifyAllClientUsers, emailAllClientUsers, buildCourseInfoBox, emailParagraph } from "@/lib/notify-client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const effectiveClient = await getEffectiveClientContext();
  if (!effectiveClient) {
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

  if (!edition || edition.clientId !== effectiveClient.clientId) {
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
      clientId: effectiveClient.clientId,
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

  // Validate employees based on client's custom fields configuration
  const clientRecord = await prisma.client.findUnique({
    where: { id: effectiveClient.clientId },
    select: { hasCustomFields: true },
  });

  let requiredCustomFields: { name: string; standardField: string | null }[] = [];
  if (clientRecord?.hasCustomFields) {
    requiredCustomFields = await prisma.clientCustomField.findMany({
      where: { clientId: effectiveClient.clientId, isActive: true, required: true },
      select: { name: true, standardField: true },
    });
  }

  const invalidEmployees = registrations.filter((reg) => {
    const emp = reg.employee;

    if (clientRecord?.hasCustomFields) {
      // Custom fields mode: minimum existence (cognome or email) + required custom fields
      if (!emp.cognome?.trim() && !emp.email?.trim()) return true;
      for (const field of requiredCustomFields) {
        if (field.standardField) {
          const val = (emp as any)[field.standardField];
          if (!val || !String(val).trim()) return true;
        } else {
          const cd = emp.customData as Record<string, any> | null;
          const val = cd?.[field.name];
          if (!val || !String(val).trim()) return true;
        }
      }
      return false;
    }

    // Standard mode: require core fields
    return (
      !emp.nome?.trim() ||
      !emp.cognome?.trim() ||
      !emp.codiceFiscale?.trim() ||
      !emp.dataNascita ||
      !emp.luogoNascita?.trim()
    );
  });

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
      clientId: effectiveClient.clientId,
      status: "INSERTED",
    },
    data: { status: "CONFIRMED" },
  });

  await logAudit({
    userId: effectiveClient.userId,
    action: "REGISTRY_SUBMIT",
    entityType: "CourseEdition",
    entityId: params.id,
    ipAddress: getClientIP(request),
  });

  const client = await prisma.client.findUnique({
    where: { id: effectiveClient.clientId },
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

  // Notify all client users that their registry submission was confirmed
  try {
    await notifyAllClientUsers({
      clientId: effectiveClient.clientId,
      type: "REGISTRY_CONFIRMED",
      title: "Anagrafiche inviate con successo",
      message: `Le anagrafiche per ${edition.course.title} (Ed. #${edition.editionNumber}) sono state inviate. Saranno verificate dall'ente di formazione.`,
      courseEditionId: edition.id,
      excludeUserId: effectiveClient.userId,
    });
    void emailAllClientUsers({
      clientId: effectiveClient.clientId,
      emailType: "REGISTRY_CONFIRMED",
      subject: `Anagrafiche inviate - ${edition.course.title} (Ed. #${edition.editionNumber})`,
      title: "Anagrafiche Inviate",
      bodyHtml: `
        ${emailParagraph(`Le anagrafiche per il seguente corso sono state inviate con successo:`)}
        ${buildCourseInfoBox(edition.course.title, edition.editionNumber, `<p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Dipendenti inseriti:</strong> ${registrations.length}</p>`)}
        ${emailParagraph("Le anagrafiche saranno verificate dall'ente di formazione.")}
      `,
      ctaText: "Vedi Dettagli",
      ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/corsi/${edition.id}`,
      courseEditionId: edition.id,
      excludeUserId: effectiveClient.userId,
    });
  } catch (error) {
    console.error("Errore notifica REGISTRY_CONFIRMED:", error);
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
