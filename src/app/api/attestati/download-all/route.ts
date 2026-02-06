import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import archiver from "archiver";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const querySchema = z.object({
  clientId: z.string().optional(),
  employeeId: z.string().optional(),
});

function safeSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "Dipendente";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { clientId, employeeId } = validation.data;
  const isAdmin = session.user.role === "ADMIN";
  const scopedClientId = isAdmin ? clientId : session.user.clientId;

  if (!isAdmin && !scopedClientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const where: Prisma.CertificateWhereInput = {
    ...(scopedClientId ? { clientId: scopedClientId } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  const certificates = await prisma.certificate.findMany({
    where,
    include: {
      employee: { select: { id: true, nome: true, cognome: true } },
      client: { select: { ragioneSociale: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  if (!certificates.length) {
    return NextResponse.json({ error: "Nessun attestato trovato" }, { status: 404 });
  }

  const available = certificates.filter((cert) => fs.existsSync(cert.filePath));
  if (!available.length) {
    return NextResponse.json(
      { error: "Nessun file disponibile per il download" },
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  for (const cert of available) {
    const employeeName = safeSegment(
      `${cert.employee.cognome}_${cert.employee.nome}`
    );
    const filename = path.basename(cert.filePath);
    archive.append(fs.createReadStream(cert.filePath), {
      name: `${employeeName}/${filename}`,
    });
  }

  archive.finalize();

  await logAudit({
    userId: session.user.id,
    action: "CERT_DOWNLOAD",
    entityType: "Certificate",
    entityId: "download-all",
    ipAddress: getClientIP(request),
  });

  const label = isAdmin && scopedClientId
    ? safeSegment(scopedClientId)
    : "attestati";

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${label}_${Date.now()}.zip\"`,
    },
  });
}
