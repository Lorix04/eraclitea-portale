import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { stringify } from "csv-stringify/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";
import { formatItalianDate } from "@/lib/date-utils";
import { Prisma, RegistrationStatus } from "@prisma/client";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exportType = searchParams.get("type") || "registrations";
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const courseId = searchParams.get("courseId");
  const courseEditionId =
    searchParams.get("courseEditionId") ?? courseId ?? undefined;
  const clientId = searchParams.get("clientId");
  const statusParam = searchParams.get("status");
  const separator = searchParams.get("separator") || ";";
  const includeHeader = searchParams.get("header") !== "0";
  const preview = searchParams.get("preview") === "1";
  const limit = Number(searchParams.get("limit") || 5);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const status = statusParam &&
    Object.values(RegistrationStatus).includes(statusParam as RegistrationStatus)
      ? (statusParam as RegistrationStatus)
      : undefined;

  const dateRange = (() => {
    if (!dateFrom && !dateTo) return undefined;
    const range: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        range.gte = parsed;
      }
    }
    if (dateTo) {
      const parsed = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(parsed.getTime())) {
        range.lte = parsed;
      }
    }
    return Object.keys(range).length ? range : undefined;
  })();

  let rows: Record<string, string | number>[] = [];

  if (exportType === "courses") {
    const where: Prisma.CourseWhereInput = {
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const courses = await prisma.course.findMany({
      where,
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: preview ? limit : undefined,
    });

    rows = courses.map((course) => ({
      Titolo: course.title,
      Ore: course.durationHours ?? "",
      Visibilita: course.visibilityType,
      Categorie: course.categories
        .map((entry) => entry.category.name)
        .join(", "),
    }));
  } else if (exportType === "clients") {
    const where: Prisma.ClientWhereInput = {
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(clientId ? { id: clientId } : {}),
    };

    const clients = await prisma.client.findMany({
      where,
      include: { _count: { select: { employees: true } } },
      orderBy: { ragioneSociale: "asc" },
      take: preview ? limit : undefined,
    });

    rows = clients.map((client) => ({
      "Ragione Sociale": client.ragioneSociale,
      "P.IVA": client.piva,
      "Email Referente": client.referenteEmail,
      Telefono: client.telefono || "",
      Attivo: client.isActive ? "Si" : "No",
      "Numero Dipendenti": client._count?.employees ?? 0,
      "Creato Il": formatItalianDate(client.createdAt),
    }));
  } else if (exportType === "employees") {
    const where: Prisma.EmployeeWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const employees = await prisma.employee.findMany({
      where,
      include: { client: true, _count: { select: { registrations: true } } },
      orderBy: { cognome: "asc" },
      take: preview ? limit : undefined,
    });

    rows = employees.map((employee) => ({
      Nome: employee.nome,
      Cognome: employee.cognome,
      "Codice Fiscale": employee.codiceFiscale,
      Email: employee.email || "",
      Mansione: employee.mansione || "",
      Cliente: employee.client?.ragioneSociale || "",
      "Data Nascita": formatItalianDate(employee.dataNascita),
      "Numero Corsi": employee._count?.registrations ?? 0,
      "Creato Il": formatItalianDate(employee.createdAt),
    }));
  } else if (exportType === "certificates") {
    const where: Prisma.CertificateWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(dateRange ? { uploadedAt: dateRange } : {}),
    };

    if (courseEditionId === "external") {
      where.courseEditionId = null;
    } else if (courseEditionId) {
      where.courseEditionId = courseEditionId;
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        employee: true,
        client: true,
        courseEdition: { include: { course: true } },
      },
      orderBy: { uploadedAt: "desc" },
      take: preview ? limit : undefined,
    });

    rows = certificates.map((certificate) => ({
      File:
        certificate.filePath?.split("/").pop() ||
        certificate.filePath ||
        "",
      Dipendente: `${certificate.employee.nome} ${certificate.employee.cognome}`,
      Cliente: certificate.client?.ragioneSociale || "",
      Corso: certificate.courseEdition?.course?.title || "Esterno",
      Edizione: certificate.courseEdition
        ? `#${certificate.courseEdition.editionNumber}`
        : "",
      "Caricato Il": formatItalianDate(certificate.uploadedAt),
    }));
  } else {
    const where: Prisma.CourseRegistrationWhereInput = {
      ...(courseEditionId ? { courseEditionId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(status ? { status } : {}),
      ...(dateRange ? { insertedAt: dateRange } : {}),
    };

    const registrations = (await prisma.courseRegistration.findMany({
      where,
      include: {
        employee: true,
        client: true,
        courseEdition: { include: { course: true } },
      },
      orderBy: { insertedAt: "desc" },
      take: preview ? limit : undefined,
    })) as Prisma.CourseRegistrationGetPayload<{
      include: { employee: true; client: true; courseEdition: { include: { course: true } } };
    }>[];

    rows = registrations.map((reg) => ({
      "Ragione Sociale": reg.client.ragioneSociale,
      Corso: reg.courseEdition.course.title,
      Edizione: `#${reg.courseEdition.editionNumber}`,
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
      "Inserito Il": formatItalianDate(reg.insertedAt),
    }));
  }

  if (preview) {
    return NextResponse.json({ rows });
  }

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    await logAudit({
      userId: session.user.id,
      action: "CSV_EXPORT",
      entityType: exportType,
      entityId: courseEditionId || clientId || "all",
      ipAddress: getClientIP(request),
    });

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="export_${Date.now()}.xlsx"`,
      },
    });
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
    entityType: exportType,
    entityId: courseEditionId || clientId || "all",
    ipAddress: getClientIP(request),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export_${Date.now()}.csv"`,
    },
  });
}
