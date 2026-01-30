import { NextResponse } from "next/server";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";
import { getClientIP, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

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

  const fileBuffer = await getFile(certificate.filePath);
  const filename = path.basename(certificate.filePath);

  await logAudit({
    userId: session.user.id,
    action: "CERT_DOWNLOAD",
    entityType: "Certificate",
    entityId: certificate.id,
    ipAddress: getClientIP(request),
  });

  const body = new Uint8Array(fileBuffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
