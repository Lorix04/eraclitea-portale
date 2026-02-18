import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import archiver from "archiver";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIP } from "@/lib/audit";
import { validateBody } from "@/lib/api-utils";

export const runtime = "nodejs";

const downloadZipSchema = z.object({
  certificateIds: z.array(z.string().cuid()).min(1).max(100),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const validation = await validateBody(request, downloadZipSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const ids = validation.data.certificateIds;

  const where: Record<string, unknown> = {
    id: { in: ids },
  };

  if (!isAdminView) {
    const clientId = effectiveClient?.clientId ?? session.user.clientId;
    if (!clientId) {
      return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
    }
    where.clientId = clientId;
  }

  const certificates = await prisma.certificate.findMany({ where });
  if (!certificates.length) {
    return NextResponse.json({ error: "Attestati non trovati" }, { status: 404 });
  }

  const available = certificates.filter((cert) => fs.existsSync(cert.filePath));
  if (available.length === 0) {
    return NextResponse.json(
      { error: "Nessun file disponibile per il download" },
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  for (const cert of available) {
    const filePath = cert.filePath;
    const filename = path.basename(filePath);
    archive.append(fs.createReadStream(filePath), { name: filename });
  }

  archive.finalize();

  await logAudit({
    userId: session.user.id,
    action: "CERT_DOWNLOAD",
    entityType: "Certificate",
    entityId: ids.join(","),
    ipAddress: getClientIP(request),
  });

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="attestati_${Date.now()}.zip"`,
    },
  });
}
