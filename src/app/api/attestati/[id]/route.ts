import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCertificateFile } from "@/lib/certificate-storage";
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
