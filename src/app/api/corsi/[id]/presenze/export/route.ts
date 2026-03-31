import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { formatItalianDate } from "@/lib/date-utils";
import {
  calculateAttendanceStats,
  getEffectiveHours,
  type AttendanceStatus,
} from "@/lib/attendance-utils";
import { checkApiPermission, canAccessArea } from "@/lib/permissions";

export const runtime = "nodejs";

const querySchema = z.object({
  format: z.enum(["csv", "pdf"]).default("csv"),
});

type AttendanceEntry = {
  status: AttendanceStatus;
  hoursAttended?: number | null;
  notes?: string | null;
};

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getStatusLabel(status: AttendanceStatus) {
  if (status === "PRESENT") return "P";
  if (status === "ABSENT_JUSTIFIED") return "G";
  return "A";
}

async function getAttendanceMatrix(
  courseEditionId: string,
  role: "ADMIN" | "CLIENT",
  clientId?: string | null
) {
  const edition = await prisma.courseEdition.findUnique({
    where: { id: courseEditionId },
    select: {
      id: true,
      clientId: true,
      editionNumber: true,
      presenzaMinimaType: true,
      presenzaMinimaValue: true,
      course: { select: { id: true, title: true } },
    },
  });

  if (!edition) {
    return null;
  }

  if (role === "CLIENT" && edition.clientId !== clientId) {
    return {
      edition,
      lessons: [],
      employees: [],
      attendances: [],
      stats: [],
      totalLessons: 0,
      totalHours: 0,
      presenzaMinimaType: null,
      presenzaMinimaValue: null,
    };
  }

  const registrationWhere =
    role === "ADMIN"
      ? { courseEditionId: edition.id }
      : { courseEditionId: edition.id, clientId: clientId ?? undefined };

  const registrations = await prisma.courseRegistration.findMany({
    where: registrationWhere,
    include: { employee: true },
    orderBy: { employee: { cognome: "asc" } },
  });

  if (role === "CLIENT" && registrations.length === 0) {
    return {
      edition,
      lessons: [],
      employees: [],
      attendances: [],
      stats: [],
      totalLessons: 0,
      totalHours: 0,
      presenzaMinimaType: null,
      presenzaMinimaValue: null,
    };
  }

  const employees = registrations.map((reg) => reg.employee);
  const employeeIds = employees.map((employee) => employee.id);

  const lessons = await prisma.lesson.findMany({
    where: { courseEditionId: edition.id },
    orderBy: { date: "asc" },
  });

  const lessonIds = lessons.map((lesson) => lesson.id);
  const attendances = lessonIds.length
    ? await prisma.attendance.findMany({
        where: {
          lessonId: { in: lessonIds },
          employeeId: { in: employeeIds },
        },
      })
    : [];

  const calculated = calculateAttendanceStats({
    employees: employees.map((employee) => ({
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
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
    presenzaMinimaType: edition.presenzaMinimaType,
    presenzaMinimaValue: edition.presenzaMinimaValue,
  });

  return {
    edition,
    lessons,
    employees,
    attendances,
    stats: calculated.stats,
    totalLessons: calculated.totalLessons,
    totalHours: calculated.totalHours,
    presenzaMinimaType: calculated.presenzaMinimaType,
    presenzaMinimaValue: calculated.presenzaMinimaValue,
  };
}

function buildCsv(
  matrix: NonNullable<Awaited<ReturnType<typeof getAttendanceMatrix>>>
) {
  const lessonHeaders = matrix.lessons.flatMap((lesson) => {
    const label = formatItalianDate(lesson.date);
    return [`${label} (Stato)`, `${label} (Ore frequentate)`];
  });

  const header = [
    "Dipendente",
    ...lessonHeaders,
    "Presenti",
    "Assenti",
    "Giustificati",
    "Ore totali",
    "Ore frequentate totali",
    "% ore",
  ];

  const attendanceMap = new Map<string, AttendanceEntry>();
  matrix.attendances.forEach((attendance) => {
    attendanceMap.set(`${attendance.lessonId}:${attendance.employeeId}`, {
      status: attendance.status as AttendanceStatus,
      hoursAttended: attendance.hoursAttended,
      notes: attendance.notes,
    });
  });

  const rows = matrix.employees.map((employee) => {
    const stat = matrix.stats.find((item) => item.employeeId === employee.id);
    const lessonCells = matrix.lessons.flatMap((lesson) => {
      const entry = attendanceMap.get(`${lesson.id}:${employee.id}`);
      const status = entry?.status ?? "ABSENT";
      const effectiveHours = getEffectiveHours(
        {
          status,
          hoursAttended: entry?.hoursAttended ?? null,
        },
        lesson.durationHours ?? 0
      );

      return [getStatusLabel(status), formatHours(effectiveHours)];
    });

    return [
      `${employee.cognome} ${employee.nome}`,
      ...lessonCells,
      stat?.present ?? 0,
      stat?.absent ?? 0,
      stat?.justified ?? 0,
      formatHours(stat?.totalHours ?? 0),
      formatHours(stat?.attendedHours ?? 0),
      `${stat?.percentage ?? 0}%`,
    ];
  });

  return stringify([header, ...rows]);
}

async function buildPdf(
  matrix: NonNullable<Awaited<ReturnType<typeof getAttendanceMatrix>>>
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 30,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const endPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text("Registro Presenze", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .text(
      `Corso: ${matrix.edition.course.title} (Ed. #${matrix.edition.editionNumber})`
    );
  if (matrix.lessons.length) {
    const first = formatItalianDate(matrix.lessons[0].date);
    const last = formatItalianDate(matrix.lessons[matrix.lessons.length - 1].date);
    doc.text(`Periodo: ${first} - ${last}`);
  }
  doc.text(`Totale ore edizione: ${formatHours(matrix.totalHours)}h`);
  doc.moveDown(0.5);

  const lessonLabels = matrix.lessons.map((lesson) =>
    formatItalianDate(lesson.date)
  );
  const header = ["Dipendente", ...lessonLabels, "% ore", "Ore"];

  doc.fontSize(9).font("Courier");
  doc.text(header.join(" | "));

  const attendanceMap = new Map<string, AttendanceEntry>();
  matrix.attendances.forEach((attendance) => {
    attendanceMap.set(`${attendance.lessonId}:${attendance.employeeId}`, {
      status: attendance.status as AttendanceStatus,
      hoursAttended: attendance.hoursAttended,
      notes: attendance.notes,
    });
  });

  matrix.employees.forEach((employee) => {
    const stat = matrix.stats.find((item) => item.employeeId === employee.id);
    const cells = matrix.lessons.map((lesson) => {
      const entry = attendanceMap.get(`${lesson.id}:${employee.id}`);
      const status = entry?.status ?? "ABSENT";
      const effectiveHours = getEffectiveHours(
        {
          status,
          hoursAttended: entry?.hoursAttended ?? null,
        },
        lesson.durationHours ?? 0
      );
      return `${getStatusLabel(status)}(${formatHours(effectiveHours)}h)`;
    });
    const row = [
      `${employee.cognome} ${employee.nome}`,
      ...cells,
      `${stat?.percentage ?? 0}%`,
      `${formatHours(stat?.attendedHours ?? 0)}/${formatHours(stat?.totalHours ?? 0)}h`,
    ];
    doc.text(row.join(" | "));
  });

  doc.end();
  return await endPromise;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  if (isAdminView) {
    if (!canAccessArea(session.user.permissions, "presenze", session.user.isSuperAdmin)) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }
  }

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { format } = validation.data;
  const scopedRole: "ADMIN" | "CLIENT" = isAdminView ? "ADMIN" : "CLIENT";
  const scopedClientId = isAdminView
    ? session.user.clientId
    : effectiveClient?.clientId;

  if (scopedRole === "CLIENT" && !scopedClientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const matrix = await getAttendanceMatrix(
    context.params.id,
    scopedRole,
    scopedClientId
  );

  if (!matrix) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  if (matrix.employees.length === 0) {
    return NextResponse.json({ error: "Nessun dato disponibile" }, { status: 404 });
  }

  if (format === "pdf") {
    const pdfBuffer = await buildPdf(matrix);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"presenze_${context.params.id}.pdf\"`,
      },
    });
  }

  const csv = buildCsv(matrix);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"presenze_${context.params.id}.csv\"`,
    },
  });
}
