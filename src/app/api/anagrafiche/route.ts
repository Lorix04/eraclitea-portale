import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCodiceFiscale } from "@/lib/validators";
import { getClientIP, logAudit } from "@/lib/audit";
import { parseItalianDate } from "@/lib/date-utils";

type EmployeeRow = {
  nome?: string;
  cognome?: string;
  codiceFiscale?: string;
  dataNascita?: string | Date | null;
  luogoNascita?: string | null;
  email?: string | null;
  mansione?: string | null;
  note?: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: employees });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const body = await request.json();
  const requestedClientId =
    typeof body.clientId === "string" ? body.clientId : undefined;

  const clientId = isAdmin ? requestedClientId : session.user.clientId;
  if (!clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  if (!isAdmin && requestedClientId && requestedClientId !== clientId) {
    return NextResponse.json(
      { error: "ClientId non valido" },
      { status: 403 }
    );
  }
  const rows: EmployeeRow[] = Array.isArray(body.employees) ? body.employees : [];
  const courseEditionId =
    typeof body.courseEditionId === "string" ? body.courseEditionId : undefined;
  if (courseEditionId) {
    const edition = await prisma.courseEdition.findUnique({
      where: { id: courseEditionId },
      select: { clientId: true },
    });
    if (!edition) {
      return NextResponse.json(
        { error: "Edizione non trovata" },
        { status: 404 }
      );
    }
    if (edition.clientId !== clientId) {
      return NextResponse.json(
        { error: "Edizione non associata al cliente" },
        { status: 403 }
      );
    }
  }

  const filtered = rows
    .map((row) => ({
      ...row,
      codiceFiscale: row.codiceFiscale
        ? normalizeCodiceFiscale(row.codiceFiscale)
        : "",
    }))
    .filter((row) => row.codiceFiscale);

  const savedEmployees = [] as typeof filtered;
  const errors: Array<{ codiceFiscale?: string; field?: string; message: string }> = [];

  const results = await Promise.all(
    filtered.map(async (row) => {
      const rawDate = row.dataNascita ? String(row.dataNascita) : "";
      const parsedDate = rawDate ? parseItalianDate(rawDate) : null;

      if (rawDate && !parsedDate) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          field: "dataNascita",
          message: `Data non valida: "${rawDate}". Usa il formato GG/MM/AAAA`,
        });
        return null;
      }

      try {
        const employee = await prisma.employee.upsert({
          where: {
            clientId_codiceFiscale: {
              clientId,
              codiceFiscale: row.codiceFiscale as string,
            },
          },
          update: {
            nome: row.nome ?? "",
            cognome: row.cognome ?? "",
            dataNascita: parsedDate,
            luogoNascita: row.luogoNascita ?? null,
            email: row.email ?? null,
            mansione: row.mansione ?? null,
            note: row.note ?? null,
          },
          create: {
            clientId,
            nome: row.nome ?? "",
            cognome: row.cognome ?? "",
            codiceFiscale: row.codiceFiscale as string,
            dataNascita: parsedDate,
            luogoNascita: row.luogoNascita ?? null,
            email: row.email ?? null,
            mansione: row.mansione ?? null,
            note: row.note ?? null,
          },
        });
        savedEmployees.push(row);
        return employee;
      } catch (_error) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          message: "Errore durante il salvataggio",
        });
        return null;
      }
    })
  );

  const savedResults = results.filter(Boolean) as typeof results;

  if (courseEditionId) {
    await prisma.courseRegistration.createMany({
      data: savedResults.map((employee) => ({
        clientId,
        courseEditionId,
        employeeId: employee!.id,
        status: "INSERTED",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "REGISTRY_UPDATE",
    entityType: "Employee",
    entityId: clientId,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json(
    {
      data: savedResults,
      saved: savedResults.length,
      errors: errors.length > 0 ? errors : undefined,
      savedAt: new Date().toISOString(),
    },
    { status: 201 }
  );
}
