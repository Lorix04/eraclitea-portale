import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCertificateFile, saveCertificateFile } from "@/lib/certificate-storage";
import { getClientIP, logAudit } from "@/lib/audit";

export const runtime = "nodejs";
const ALLOWED_CERTIFICATE_TYPES = new Set(["application/pdf"]);
const MAX_CERTIFICATE_SIZE_BYTES = 10 * 1024 * 1024;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: context.params.id },
    include: {
      employee: { select: { id: true, nome: true, cognome: true } },
      courseEdition: {
        select: {
          id: true,
          editionNumber: true,
          course: { select: { id: true, title: true } },
        },
      },
      client: { select: { id: true, ragioneSociale: true } },
      uploader: { select: { email: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    session.user.role === "CLIENT" &&
    certificate.clientId !== session.user.clientId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: certificate });
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: context.params.id },
  });

  if (!certificate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteCertificateFile(certificate.filePath);
  } catch {
    // ignore missing file errors
  }

  await prisma.certificate.delete({ where: { id: context.params.id } });

  await logAudit({
    userId: session.user.id,
    action: "CERTIFICATE_DELETE",
    entityType: "Certificate",
    entityId: certificate.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: context.params.id },
    select: { id: true, filePath: true },
  });

  if (!certificate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const courseEditionId = String(formData.get("courseEditionId") ?? "").trim();
  const achievedAtRaw = String(formData.get("achievedAt") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const file = formData.get("file");

  if (!employeeId || !courseEditionId || !achievedAtRaw) {
    return NextResponse.json(
      { error: "Campi obbligatori mancanti" },
      { status: 400 }
    );
  }

  const achievedAt = new Date(achievedAtRaw);
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

  if (expiresAt && expiresAt <= achievedAt) {
    return NextResponse.json(
      {
        error:
          "La data scadenza deve essere successiva alla data rilascio",
      },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, clientId: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Dipendente non trovato" },
      { status: 400 }
    );
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: courseEditionId },
    select: { id: true, clientId: true },
  });
  if (!edition) {
    return NextResponse.json(
      { error: "Edizione non trovata" },
      { status: 400 }
    );
  }

  if (edition.clientId !== employee.clientId) {
    return NextResponse.json(
      {
        error:
          "Dipendente ed edizione appartengono a clienti diversi",
      },
      { status: 400 }
    );
  }

  let newFilePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const isPdfType =
      ALLOWED_CERTIFICATE_TYPES.has(file.type) ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfType) {
      return NextResponse.json(
        { error: "Solo file PDF accettati" },
        { status: 400 }
      );
    }
    if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File troppo grande (max 10MB)" },
        { status: 400 }
      );
    }

    newFilePath = await saveCertificateFile(file, employee.clientId, employee.id);
  }

  try {
    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        clientId: employee.clientId,
        employeeId: employee.id,
        courseEditionId: edition.id,
        achievedAt,
        expiresAt,
        uploadedBy: session.user.id,
        ...(newFilePath ? { filePath: newFilePath } : {}),
      },
    });

    if (newFilePath && certificate.filePath && certificate.filePath !== newFilePath) {
      try {
        await deleteCertificateFile(certificate.filePath);
      } catch {
        // ignore missing file errors
      }
    }

    await logAudit({
      userId: session.user.id,
      action: "CERT_UPLOAD",
      entityType: "Certificate",
      entityId: certificate.id,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (newFilePath) {
      try {
        await deleteCertificateFile(newFilePath);
      } catch {
        // ignore cleanup errors
      }
    }

    console.error("Errore aggiornamento attestato:", error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento attestato" },
      { status: 500 }
    );
  }
}
