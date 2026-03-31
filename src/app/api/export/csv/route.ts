import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { stringify } from "csv-stringify/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIP, logAudit } from "@/lib/audit";
import { formatItalianDate } from "@/lib/date-utils";
import { Prisma, RegistrationStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import { checkApiPermission } from "@/lib/permissions";

const EMPLOYEE_EXPORT_COLUMNS = [
  "cognome",
  "nome",
  "sesso",
  "nascita",
  "comune_nasc",
  "indirizzo",
  "regione",
  "provincia",
  "comune",
  "cap",
  "cod_fiscale",
  "professione",
  "telefono",
  "cellulare",
  "email",
  "email_aziendale",
  "partita_IVA",
  "IBAN",
  "ndipendenti",
  "fondo_interprof",
  "pec",
] as const;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "export", "export")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
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
  let employeeExportExtraColumns: string[] = [];
  let useOnlyCustomColumns = false;

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

    // Fetch custom fields if exporting for a single client with includeCustom
    const includeCustom = searchParams.get("includeCustom") === "true";
    let customFieldDefs: { name: string; label: string; columnHeader: string | null; type: string }[] = [];
    if (clientId && includeCustom) {
      const cl = await prisma.client.findUnique({ where: { id: clientId }, select: { hasCustomFields: true } });
      if (cl?.hasCustomFields) {
        customFieldDefs = await prisma.clientCustomField.findMany({
          where: { clientId, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { name: true, label: true, columnHeader: true, type: true },
        });
      }
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        cognome: true,
        nome: true,
        sesso: true,
        dataNascita: true,
        luogoNascita: true,
        indirizzo: true,
        regione: true,
        provincia: true,
        comuneResidenza: true,
        cap: true,
        codiceFiscale: true,
        mansione: true,
        telefono: true,
        cellulare: true,
        email: true,
        emailAziendale: true,
        partitaIva: true,
        iban: true,
        pec: true,
        customData: true,
      },
      orderBy: { cognome: "asc" },
      take: preview ? limit : undefined,
    });

    const toValue = (value: string | null | undefined) => value ?? "";

    if (includeCustom && customFieldDefs.length > 0) {
      // Custom format: ONLY custom field columns
      const fullDefs = await prisma.clientCustomField.findMany({
        where: { clientId: clientId!, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { name: true, label: true, columnHeader: true, standardField: true },
      });

      const STANDARD_GETTERS: Record<string, (e: any) => string> = {
        nome: (e) => toValue(e.nome), cognome: (e) => toValue(e.cognome),
        codiceFiscale: (e) => toValue(e.codiceFiscale), sesso: (e) => toValue(e.sesso),
        dataNascita: (e) => formatItalianDate(e.dataNascita), luogoNascita: (e) => toValue(e.luogoNascita),
        email: (e) => toValue(e.email), comuneResidenza: (e) => toValue(e.comuneResidenza),
        cap: (e) => toValue(e.cap), provincia: (e) => toValue(e.provincia),
        regione: (e) => toValue(e.regione), indirizzo: (e) => toValue(e.indirizzo),
        telefono: (e) => toValue(e.telefono), cellulare: (e) => toValue(e.cellulare),
        mansione: (e) => toValue(e.mansione), emailAziendale: (e) => toValue(e.emailAziendale),
        pec: (e) => toValue(e.pec), partitaIva: (e) => toValue(e.partitaIva),
        iban: (e) => toValue(e.iban), note: (e) => toValue(e.note),
      };

      employeeExportExtraColumns = fullDefs.map((cf) => cf.columnHeader || cf.label);
      // Override: use ONLY custom columns (no standard)
      useOnlyCustomColumns = true;

      rows = employees.map((employee) => {
        const row: Record<string, string> = {};
        const cd = (employee.customData as Record<string, any>) || {};
        for (const cf of fullDefs) {
          const header = cf.columnHeader || cf.label;
          if (cf.standardField && STANDARD_GETTERS[cf.standardField]) {
            row[header] = STANDARD_GETTERS[cf.standardField](employee);
          } else {
            row[header] = toValue(cd[cf.name]);
          }
        }
        return row;
      });
    } else {
      // Standard format
      rows = employees.map((employee) => ({
        cognome: toValue(employee.cognome),
        nome: toValue(employee.nome),
        sesso: toValue(employee.sesso),
        nascita: formatItalianDate(employee.dataNascita),
        comune_nasc: toValue(employee.luogoNascita),
        indirizzo: toValue(employee.indirizzo),
        regione: toValue(employee.regione),
        provincia: toValue(employee.provincia),
        comune: toValue(employee.comuneResidenza),
        cap: toValue(employee.cap),
        cod_fiscale: toValue(employee.codiceFiscale),
        professione: toValue(employee.mansione),
        telefono: toValue(employee.telefono),
        cellulare: toValue(employee.cellulare),
        email: toValue(employee.email),
        email_aziendale: toValue(employee.emailAziendale),
        partita_IVA: toValue(employee.partitaIva),
        IBAN: toValue(employee.iban),
        ndipendenti: "",
        fondo_interprof: "",
        pec: toValue(employee.pec),
      }));
    }
  } else if (exportType === "teachers") {
    const where: Prisma.TeacherWhereInput = {
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        categories: {
          select: {
            name: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: preview ? limit : undefined,
    });

    rows = teachers.map((teacher) => ({
      Nome: teacher.firstName,
      Cognome: teacher.lastName,
      Email: teacher.email ?? "",
      Telefono: teacher.phone ?? "",
      Specializzazione: teacher.specialization ?? "",
      Provincia: teacher.province ?? "",
      Regione: teacher.region ?? "",
      Aree: teacher.categories.map((category) => category.name).join(", "),
      Stato: teacher.active ? "Attivo" : "Inattivo",
      "Lezioni assegnate": teacher._count.assignments,
      Note: teacher.notes ?? "",
    }));
  } else if (exportType === "editions") {
    const where: Prisma.CourseEditionWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(dateRange ? { startDate: dateRange } : {}),
    };

    const editions = await prisma.courseEdition.findMany({
      where,
      include: {
        course: { select: { title: true } },
        client: { select: { ragioneSociale: true } },
        lessons: { select: { luogo: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: [{ startDate: "desc" }, { editionNumber: "desc" }],
      take: preview ? limit : undefined,
    });

    rows = editions.map((edition) => {
      const uniqueLocations = Array.from(
        new Set(
          edition.lessons
            .map((lesson) => lesson.luogo?.trim())
            .filter((value): value is string => Boolean(value))
        )
      );

      // NOTE: maxParticipants is not present in current Prisma model.
      // Placeholder kept to preserve requested export shape.
      return {
        "Codice edizione": edition.id,
        "Nome corso": edition.course.title,
        Cliente: edition.client.ragioneSociale,
        "Data inizio": formatItalianDate(edition.startDate),
        "Data fine": formatItalianDate(edition.endDate),
        Locazione: uniqueLocations.join(", "),
        "Numero partecipanti previsti": "",
        "Numero iscrizioni": edition._count.registrations,
        "Fase/Stato": edition.status,
        Note: edition.notes ?? "",
      };
    });
  } else if (exportType === "course-areas") {
    const where: Prisma.CategoryWhereInput = {
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { name: "asc" },
      take: preview ? limit : undefined,
    });

    rows = categories.map((category) => ({
      "Nome area/categoria": category.name,
      Descrizione: category.description ?? "",
      "Numero corsi associati": category._count.courses,
      // NOTE: no isActive flag exists in current Category schema.
      Attiva: "Si",
    }));
  } else if (exportType === "tickets") {
    const where: Prisma.TicketWhereInput = {
      ...(clientId
        ? {
            client: {
              is: {
                clientId,
              },
            },
          }
        : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: {
          select: {
            email: true,
            client: { select: { ragioneSociale: true } },
          },
        },
        messages: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: preview ? limit : undefined,
    });

    rows = tickets.map((ticket) => ({
      "ID / Numero ticket": ticket.id,
      "Oggetto/Titolo": ticket.subject,
      Cliente: ticket.client?.client?.ragioneSociale ?? "",
      "Utente che ha aperto": ticket.client?.email ?? "",
      Stato: ticket.status,
      Priorita: ticket.priority,
      "Data apertura": formatItalianDate(ticket.createdAt),
      "Data ultima risposta": formatItalianDate(
        ticket.messages[0]?.createdAt ?? ticket.updatedAt
      ),
      "Numero messaggi": ticket._count.messages,
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
      Nome: reg.employee.nome ?? "",
      Cognome: reg.employee.cognome ?? "",
      "Codice Fiscale": reg.employee.codiceFiscale ?? "",
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

  const isEmployeesExport = exportType === "employees";
  const empColumns = isEmployeesExport
    ? useOnlyCustomColumns
      ? employeeExportExtraColumns
      : [...EMPLOYEE_EXPORT_COLUMNS, ...employeeExportExtraColumns]
    : undefined;
  const csvRaw = stringify(rows, {
    header: includeHeader,
    delimiter: isEmployeesExport ? ";" : separator,
    record_delimiter: isEmployeesExport ? "\r\n" : undefined,
    columns: empColumns,
  });
  const csv = `\uFEFF${csvRaw}`;

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
