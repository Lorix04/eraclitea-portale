import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { parseItalianDate } from "@/lib/date-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { validateBody } from "@/lib/api-utils";

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().max(max).optional().nullable()
  );

const toNullableField = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  return value || null;
};

const updateSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(100),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  sesso: z.enum(["M", "F"], { required_error: "Sesso obbligatorio" }),
  dataNascita: z.union([
    z.string().trim().min(1, "Data di nascita obbligatoria"),
    z.date(),
  ]),
  luogoNascita: z
    .string()
    .trim()
    .min(1, "Comune di nascita obbligatorio")
    .max(100),
  email: z.string().trim().min(1, "Email obbligatoria").email("Email non valida"),
  telefono: optionalString(30),
  cellulare: optionalString(30),
  indirizzo: optionalString(255),
  comuneResidenza: z
    .string()
    .trim()
    .min(1, "Comune di residenza obbligatorio")
    .max(100),
  cap: z.string().trim().min(1, "CAP obbligatorio").max(5),
  mansione: optionalString(100),
  note: optionalString(500),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, ragioneSociale: true } },
      registrations: {
        include: {
          courseEdition: {
            select: {
              id: true,
              editionNumber: true,
              startDate: true,
              endDate: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { insertedAt: "desc" },
      },
      certificates: {
        include: {
          courseEdition: {
            select: {
              id: true,
              editionNumber: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAdminView) {
    if (!effectiveClient || employee.clientId !== effectiveClient.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ data: employee });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.user.role === "CLIENT" && employee.clientId !== session.user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const validation = await validateBody(request, updateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const payload = validation.data;
  let parsedDate: Date | null | undefined = undefined;
  if (payload.dataNascita instanceof Date) {
    parsedDate = payload.dataNascita;
  } else if (typeof payload.dataNascita === "string") {
    parsedDate = parseItalianDate(payload.dataNascita);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Data non valida. Usa il formato GG/MM/AAAA" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: {
      nome: payload.nome,
      cognome: payload.cognome,
      sesso: payload.sesso,
      email: payload.email,
      telefono: toNullableField(payload.telefono as string | null | undefined),
      cellulare: toNullableField(payload.cellulare as string | null | undefined),
      indirizzo: toNullableField(payload.indirizzo as string | null | undefined),
      comuneResidenza: payload.comuneResidenza,
      cap: payload.cap,
      mansione: toNullableField(payload.mansione as string | null | undefined),
      luogoNascita: payload.luogoNascita,
      note: toNullableField(payload.note as string | null | undefined),
      dataNascita: parsedDate,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "EMPLOYEE_UPDATE",
    entityType: "Employee",
    entityId: updated.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          registrations: true,
          certificates: true,
          attendances: true,
        },
      },
      client: { select: { id: true, ragioneSociale: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Dipendente non trovato" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && employee.clientId !== session.user.clientId) {
    return NextResponse.json(
      { error: "Non hai i permessi per eliminare questo dipendente" },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.certificate.deleteMany({
      where: { employeeId: employee.id },
    });

    await tx.courseRegistration.deleteMany({
      where: { employeeId: employee.id },
    });

    await tx.attendance.deleteMany({
      where: { employeeId: employee.id },
    });

    await tx.employee.delete({
      where: { id: employee.id },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "EMPLOYEE_DELETE",
    entityType: "Employee",
    entityId: employee.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({
    success: true,
    message: "Dipendente eliminato con successo",
  });
}
