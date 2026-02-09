import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { formatItalianDate } from "@/lib/date-utils";

export const runtime = "nodejs";

const querySchema = z.object({
  format: z.enum(["csv", "pdf"]).default("csv"),
});

type AttendanceEntry = {
  status: string;
  notes?: string | null;
};

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
      course: { select: { id: true, title: true } },
    },
  });

  if (!edition) {
    return null;
  }

  if (role === "CLIENT" && edition.clientId !== clientId) {
    return { edition, lessons: [], employees: [], attendances: [], stats: [] };
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

  const attendanceMap = new Map<string, AttendanceEntry>();
  for (const attendance of attendances) {
    attendanceMap.set(`${attendance.lessonId}:${attendance.employeeId}`, {
      status: attendance.status,
      notes: attendance.notes,
    });
  }

  const totalLessons = lessons.length;
  const totalHours = lessons.reduce(
    (acc, lesson) => acc + (lesson.durationHours ?? 0),
    0
  );

  const stats = employees.map((employee) => {
    let present = 0;
    let justified = 0;
    let absent = 0;
    let attendedHours = 0;

    for (const lesson of lessons) {
      const entry = attendanceMap.get(`${lesson.id}:${employee.id}`);
      const status = entry?.status ?? "ABSENT";
      if (status === "PRESENT") {
        present += 1;
        attendedHours += lesson.durationHours ?? 0;
      } else if (status === "ABSENT_JUSTIFIED") {
        justified += 1;
        attendedHours += lesson.durationHours ?? 0;
      } else {
        absent += 1;
      }
    }

    const percentage = totalLessons
      ? Math.round(((present + justified) / totalLessons) * 100)
      : 0;

    return {
      employeeId: employee.id,
      employeeName: `${employee.cognome} ${employee.nome}`,
      totalLessons,
      present,
      absent,
      justified,
      percentage,
      totalHours,
      attendedHours,
      belowMinimum: totalLessons ? percentage < 75 : false,
    };
  });

  return {
    edition,
    lessons,
    employees,
    attendances,
    stats,
    totalLessons,
    totalHours,
  };
}

function buildCsv(
  matrix: NonNullable<Awaited<ReturnType<typeof getAttendanceMatrix>>>
) {
  const lessonLabels = matrix.lessons.map((lesson) =>
    formatItalianDate(lesson.date)
  );
  const header = [
    "Dipendente",
    ...lessonLabels,
    "Presenti",
    "Assenti",
    "Giustificati",
    "Percentuale",
    "Ore Totali",
    "Ore Frequentate",
  ];

  const attendanceMap = new Map<string, string>();
  matrix.attendances.forEach((attendance) => {
    attendanceMap.set(
      `${attendance.lessonId}:${attendance.employeeId}`,
      attendance.status
    );
  });

  const rows = matrix.employees.map((employee) => {
    const stat = matrix.stats.find((item) => item.employeeId === employee.id);
    const cells = matrix.lessons.map((lesson) => {
      const status = attendanceMap.get(`${lesson.id}:${employee.id}`) ?? "ABSENT";
      if (status === "PRESENT") return "P";
      if (status === "ABSENT_JUSTIFIED") return "G";
      return "A";
    });
    return [
      `${employee.cognome} ${employee.nome}`,
      ...cells,
      stat?.present ?? 0,
      stat?.absent ?? 0,
      stat?.justified ?? 0,
      `${stat?.percentage ?? 0}%`,
      stat?.totalHours ?? 0,
      stat?.attendedHours ?? 0,
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
  doc.text(`Totale ore: ${matrix.totalHours}`);
  doc.moveDown(0.5);

  const lessonLabels = matrix.lessons.map((lesson) =>
    formatItalianDate(lesson.date)
  );

  const header = [
    "Dipendente",
    ...lessonLabels,
    "%", 
    "Ore"
  ];

  doc.fontSize(9).font("Courier");
  doc.text(header.join(" | "));

  const attendanceMap = new Map<string, string>();
  matrix.attendances.forEach((attendance) => {
    attendanceMap.set(
      `${attendance.lessonId}:${attendance.employeeId}`,
      attendance.status
    );
  });

  matrix.employees.forEach((employee) => {
    const stat = matrix.stats.find((item) => item.employeeId === employee.id);
    const cells = matrix.lessons.map((lesson) => {
      const status = attendanceMap.get(`${lesson.id}:${employee.id}`) ?? "ABSENT";
      if (status === "PRESENT") return "P";
      if (status === "ABSENT_JUSTIFIED") return "G";
      return "A";
    });
    const row = [
      `${employee.cognome} ${employee.nome}`,
      ...cells,
      `${stat?.percentage ?? 0}%`,
      `${stat?.attendedHours ?? 0}/${stat?.totalHours ?? 0}`,
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

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) {
    return validation.error;
  }

  const { format } = validation.data;

  const matrix = await getAttendanceMatrix(
    context.params.id,
    session.user.role,
    session.user.clientId
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
        "Content-Disposition": `attachment; filename="presenze_${context.params.id}.pdf"`,
      },
    });
  }

  const csv = buildCsv(matrix);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="presenze_${context.params.id}.csv"`,
    },
  });
}
