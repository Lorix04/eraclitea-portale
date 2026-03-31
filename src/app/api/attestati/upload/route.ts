import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCertificateFile } from "@/lib/certificate-storage";
import { getClientIP, logAudit } from "@/lib/audit";
import { sendCertificatesAvailableEmail } from "@/lib/email-notifications";
import {
  calculateAttendanceStats,
  formatPresenceRequirementLabel,
  normalizePresenceRequirement,
  type AttendanceStatus,
} from "@/lib/attendance-utils";
import { checkApiPermission } from "@/lib/permissions";

export const runtime = "nodejs";

const CF_REGEX = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/i;
const ALLOWED_CERTIFICATE_TYPES = new Set(["application/pdf"]);
const MAX_CERTIFICATE_SIZE_BYTES = 10 * 1024 * 1024;

function extractCFFromFilename(filename: string) {
  const match = filename.match(CF_REGEX);
  return match ? match[0].toUpperCase() : null;
}

type Association = {
  filename: string;
  employeeId: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "attestati", "upload")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const formData = await request.formData();
  const courseEditionId = String(formData.get("courseEditionId") || "");
  const clientId = String(formData.get("clientId") || "");
  const achievedAtRaw = String(formData.get("achievedAt") || "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();
  const associationsRaw = formData.get("associations");

  if (!clientId) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const files = formData.getAll("files").filter(Boolean) as File[];
  if (!files.length) {
    return NextResponse.json({ error: "Nessun file caricato" }, { status: 400 });
  }

  const achievedAt = achievedAtRaw ? new Date(achievedAtRaw) : new Date();
  if (Number.isNaN(achievedAt.getTime())) {
    return NextResponse.json(
      { error: "Data rilascio non valida" },
      { status: 400 }
    );
  }

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAtRaw && (!expiresAt || Number.isNaN(expiresAt.getTime()))) {
    return NextResponse.json(
      { error: "Data scadenza non valida" },
      { status: 400 }
    );
  }
  if (expiresAt && expiresAt < achievedAt) {
    return NextResponse.json(
      { error: "La data di scadenza deve essere successiva alla data di rilascio" },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!ALLOWED_CERTIFICATE_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Il file \"${file.name}\" non e un PDF valido. Solo file PDF sono accettati.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Il file \"${file.name}\" supera la dimensione massima di 10MB.`,
        },
        { status: 400 }
      );
    }
  }

  let associationList: Association[] = [];
  if (associationsRaw) {
    try {
      associationList = JSON.parse(String(associationsRaw));
    } catch {
      return NextResponse.json({ error: "Associazioni non valide" }, { status: 400 });
    }
  }
  const associationMap = new Map(
    associationList.map((item) => [item.filename, item.employeeId])
  );

  const hasCourseEdition = Boolean(courseEditionId);
  const edition = hasCourseEdition
    ? await prisma.courseEdition.findUnique({
        where: { id: courseEditionId },
        select: {
          id: true,
          clientId: true,
          editionNumber: true,
          presenzaMinimaType: true,
          presenzaMinimaValue: true,
          status: true,
          course: { select: { title: true } },
        },
      })
    : null;

  if (hasCourseEdition && !edition) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (hasCourseEdition && edition?.clientId !== clientId) {
    return NextResponse.json(
      { error: "Edizione non associata al cliente" },
      { status: 400 }
    );
  }

  if (hasCourseEdition && edition?.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "L'edizione e archiviata. Nessuna modifica consentita." },
      { status: 403 }
    );
  }

  const employees = hasCourseEdition
    ? (
        await prisma.courseRegistration.findMany({
          where: { courseEditionId, clientId },
          include: { employee: true },
        })
      ).map((entry) => entry.employee)
    : await prisma.employee.findMany({
        where: { clientId },
        select: { id: true, nome: true, cognome: true, codiceFiscale: true },
      });

  if (!employees.length) {
    return NextResponse.json(
      { error: "Nessun dipendente disponibile per il cliente selezionato" },
      { status: 400 }
    );
  }

  const cfMap = new Map(
    employees
      .filter((entry) => entry.codiceFiscale != null)
      .map((entry) => [
        entry.codiceFiscale!.toUpperCase(),
        entry.id,
      ])
  );

  const allowedEmployeeIds = new Set(employees.map((entry) => entry.id));

  const missing: string[] = [];
  const pending: Array<{ file: File; employeeId: string }> = [];

  for (const file of files) {
    const direct = associationMap.get(file.name);
    const inferred = extractCFFromFilename(file.name);
    const employeeId = direct || (inferred ? cfMap.get(inferred) : undefined);

    if (!employeeId || !allowedEmployeeIds.has(employeeId)) {
      missing.push(file.name);
      continue;
    }

    pending.push({ file, employeeId });
  }

  if (missing.length) {
    return NextResponse.json(
      { error: "Associazione mancante", files: missing },
      { status: 400 }
    );
  }

  if (hasCourseEdition && edition) {
    const presenceRequirement = normalizePresenceRequirement(
      edition.presenzaMinimaType,
      edition.presenzaMinimaValue
    );

    if (presenceRequirement.type && presenceRequirement.value !== null) {
      const employeeIdsToUpload = Array.from(
        new Set(pending.map((item) => item.employeeId))
      );
      const lessons = await prisma.lesson.findMany({
        where: { courseEditionId: edition.id },
        select: { id: true, durationHours: true },
      });
      const lessonIds = lessons.map((lesson) => lesson.id);

      const attendances = lessonIds.length && employeeIdsToUpload.length
        ? await prisma.attendance.findMany({
            where: {
              lessonId: { in: lessonIds },
              employeeId: { in: employeeIdsToUpload },
            },
            select: {
              lessonId: true,
              employeeId: true,
              status: true,
              hoursAttended: true,
            },
          })
        : [];

      const selectedEmployees = employees.filter((employee) =>
        employeeIdsToUpload.includes(employee.id)
      );

      const calculated = calculateAttendanceStats({
        employees: selectedEmployees.map((employee) => ({
          id: employee.id,
          nome: employee.nome ?? "",
          cognome: employee.cognome ?? "",
        })),
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          durationHours: lesson.durationHours ?? 0,
        })),
        attendances: attendances.map((attendance) => ({
          lessonId: attendance.lessonId,
          employeeId: attendance.employeeId,
          status: attendance.status as AttendanceStatus,
          hoursAttended: attendance.hoursAttended,
        })),
        presenzaMinimaType: presenceRequirement.type,
        presenzaMinimaValue: presenceRequirement.value,
      });

      const blockedEmployees = calculated.stats
        .filter((stat) => stat.belowMinimum)
        .map((stat) => stat.employeeName);

      if (blockedEmployees.length > 0) {
        const requirementLabel =
          formatPresenceRequirementLabel(
            presenceRequirement.type,
            presenceRequirement.value
          ) ?? "requisito configurato";
        return NextResponse.json(
          {
            error: `I seguenti dipendenti non raggiungono la presenza minima (${requirementLabel}) e non possono ricevere l'attestato: ${blockedEmployees.join(", ")}`,
            blockedEmployees,
          },
          { status: 400 }
        );
      }
    }
  }

  const savedFiles = [] as Array<{ filePath: string; employeeId: string }>;
  for (const item of pending) {
    const filePath = await saveCertificateFile(item.file, clientId, item.employeeId);
    savedFiles.push({ filePath, employeeId: item.employeeId });
  }

  await prisma.$transaction(async (tx) => {
    await tx.certificate.createMany({
      data: savedFiles.map((item) => ({
        clientId,
        courseEditionId: courseEditionId || null,
        employeeId: item.employeeId,
        filePath: item.filePath,
        achievedAt,
        expiresAt,
        uploadedBy: session.user.id,
      })),
    });

    if (hasCourseEdition) {
      await tx.notification.create({
        data: {
          type: "CERTIFICATES_AVAILABLE",
          title: "Attestati disponibili",
          message: `Sono stati caricati ${savedFiles.length} attestati per ${edition?.course.title ?? ""} (Ed. #${edition?.editionNumber ?? "-"})`,
          courseEditionId,
          isGlobal: false,
        },
      });
    }
  });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (client && edition) {
    void sendCertificatesAvailableEmail({
      clientEmail: client.referenteEmail,
      clientName: client.referenteNome || client.ragioneSociale,
      clientId: client.id,
      courseName: edition.course.title,
      editionNumber: edition.editionNumber,
      certificateCount: savedFiles.length,
      courseEditionId: edition.id,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "CERT_UPLOAD",
    entityType: "Certificate",
    entityId: courseEditionId || savedFiles[0]?.employeeId || "external",
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ ok: true, uploaded: savedFiles.length });
}
