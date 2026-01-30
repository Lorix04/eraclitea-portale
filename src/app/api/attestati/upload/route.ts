import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { send } from "@/lib/email";
import { certificatesUploadedTemplate } from "@/lib/email-templates";
import { getClientIP, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const CF_REGEX = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/i;

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

  const formData = await request.formData();
  const courseId = String(formData.get("courseId") || "");
  const clientId = String(formData.get("clientId") || "");
  const associationsRaw = formData.get("associations");

  if (!courseId || !clientId) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const files = formData.getAll("files").filter(Boolean) as File[];
  if (!files.length) {
    return NextResponse.json({ error: "Nessun file caricato" }, { status: 400 });
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

  const registrations = await prisma.courseRegistration.findMany({
    where: { courseId, clientId },
    include: { employee: true },
  });

  const cfMap = new Map(
    registrations.map((entry) => [
      entry.employee.codiceFiscale.toUpperCase(),
      entry.employee.id,
    ])
  );

  const allowedEmployeeIds = new Set(
    registrations.map((entry) => entry.employeeId)
  );

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

  const savedFiles = [] as Array<{ filePath: string; employeeId: string }>;
  for (const item of pending) {
    const filePath = await saveFile(item.file, clientId, courseId);
    savedFiles.push({ filePath, employeeId: item.employeeId });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.certificate.createMany({
      data: savedFiles.map((item) => ({
        clientId,
        courseId,
        employeeId: item.employeeId,
        filePath: item.filePath,
        uploadedBy: session.user.id,
      })),
    });

    await tx.notification.create({
      data: {
        type: "CERT_UPLOADED",
        title: "Nuovi attestati disponibili",
        message: `Caricati ${savedFiles.length} attestati per il corso "${
          course?.title ?? ""
        }"`,
        courseId,
        isGlobal: false,
      },
    });
  });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (client) {
    await send({
      to: client.referenteEmail,
      subject: "Nuovi attestati disponibili",
      html: certificatesUploadedTemplate(course?.title ?? "Corso", savedFiles.length),
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "CERT_UPLOAD",
    entityType: "Certificate",
    entityId: courseId,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ ok: true, uploaded: savedFiles.length });
}
