import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { stringify } from "csv-stringify/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";
import { Prisma, RegistrationStatus } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const clientId = searchParams.get("clientId");
  const statusParam = searchParams.get("status");
  const separator = searchParams.get("separator") || ";";
  const includeHeader = searchParams.get("header") !== "0";
  const preview = searchParams.get("preview") === "1";
  const limit = Number(searchParams.get("limit") || 5);

  const status = statusParam &&
    Object.values(RegistrationStatus).includes(statusParam as RegistrationStatus)
    ? (statusParam as RegistrationStatus)
    : undefined;

  const where: Prisma.CourseRegistrationWhereInput = {
    ...(courseId ? { courseId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(status ? { status } : {}),
  };

  const registrations = (await prisma.courseRegistration.findMany({
    where,
    include: {
      employee: true,
      client: true,
      course: true,
    },
    orderBy: { insertedAt: "desc" },
    take: preview ? limit : undefined,
  })) as Prisma.CourseRegistrationGetPayload<{
    include: { employee: true; client: true; course: true };
  }>[];

  const rows = registrations.map((reg) => ({
    "Ragione Sociale": reg.client.ragioneSociale,
    Corso: reg.course.title,
    Nome: reg.employee.nome,
    Cognome: reg.employee.cognome,
    "Codice Fiscale": reg.employee.codiceFiscale,
    "Data Nascita": reg.employee.dataNascita
      ? reg.employee.dataNascita.toISOString().split("T")[0]
      : "",
    "Luogo Nascita": reg.employee.luogoNascita || "",
    Email: reg.employee.email || "",
    Mansione: reg.employee.mansione || "",
    Stato: reg.status,
  }));

  if (preview) {
    return NextResponse.json({ rows });
  }

  const BOM = "\uFEFF";
  const csv =
    BOM +
    stringify(rows, {
      header: includeHeader,
      delimiter: separator,
    });

  await logAudit({
    userId: session.user.id,
    action: "CSV_EXPORT",
    entityType: "CourseRegistration",
    entityId: courseId || "all",
    ipAddress: getClientIP(request),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export_${Date.now()}.csv"`,
    },
  });
}
