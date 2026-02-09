import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItalianDate } from "@/lib/date-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { validateBody } from "@/lib/api-utils";

const updateSchema = z.object({
  nome: z.string().min(1).max(100),
  cognome: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  mansione: z.string().max(100).optional().or(z.literal("")),
  luogoNascita: z.string().max(100).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
  dataNascita: z.string().optional().or(z.literal("")),
});

export async function GET(
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

  if (session.user.role === "CLIENT" && employee.clientId !== session.user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  let parsedDate: Date | null | undefined = null;
  if (payload.dataNascita) {
    parsedDate = parseItalianDate(payload.dataNascita);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Data non valida. Usa il formato GG/MM/AAAA" },
        { status: 400 }
      );
    }
  } else {
    parsedDate = null;
  }

  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: {
      nome: payload.nome,
      cognome: payload.cognome,
      email: payload.email || null,
      mansione: payload.mansione || null,
      luogoNascita: payload.luogoNascita || null,
      note: payload.note || null,
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
