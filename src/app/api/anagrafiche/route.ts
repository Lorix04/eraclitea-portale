import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { isValidCodiceFiscale, normalizeCodiceFiscale } from "@/lib/validators";
import { getClientIP, logAudit } from "@/lib/audit";
import { parseItalianDate } from "@/lib/date-utils";

type EmployeeRow = {
  nome?: string;
  cognome?: string;
  codiceFiscale?: string;
  sesso?: string | null;
  dataNascita?: string | Date | null;
  luogoNascita?: string | null;
  email?: string | null;
  telefono?: string | null;
  cellulare?: string | null;
  indirizzo?: string | null;
  comuneResidenza?: string | null;
  cap?: string | null;
  mansione?: string | null;
  note?: string | null;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const context = await getEffectiveClientContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: { clientId: context.clientId },
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
      select: {
        clientId: true,
        status: true,
        deadlineRegistry: true,
      },
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

    if (edition.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "L'edizione e archiviata. Nessuna modifica consentita." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      if (edition.status === "CLOSED") {
        return NextResponse.json(
          {
            error:
              "L'edizione e chiusa. Le anagrafiche non sono modificabili.",
          },
          { status: 403 }
        );
      }

      if (edition.status !== "PUBLISHED") {
        return NextResponse.json(
          {
            error:
              "Le anagrafiche non possono essere modificate: l'edizione non e aperta.",
          },
          { status: 403 }
        );
      }

      if (
        edition.deadlineRegistry &&
        new Date() > new Date(edition.deadlineRegistry)
      ) {
        return NextResponse.json(
          {
            error:
              "Le anagrafiche non possono essere modificate: la deadline e scaduta.",
          },
          { status: 403 }
        );
      }
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
      const nome = String(row.nome ?? "").trim();
      const cognome = String(row.cognome ?? "").trim();
      const sessoRaw = String(row.sesso ?? "").trim().toUpperCase();
      const luogoNascita = String(row.luogoNascita ?? "").trim();
      const emailRaw = String(row.email ?? "").trim();
      const rawDate = row.dataNascita ? String(row.dataNascita).trim() : "";

      const missingFields: string[] = [];
      if (!nome) missingFields.push("nome");
      if (!cognome) missingFields.push("cognome");
      if (!sessoRaw) missingFields.push("sesso");
      if (!rawDate) missingFields.push("dataNascita");
      if (!luogoNascita) missingFields.push("luogoNascita");
      if (!emailRaw) missingFields.push("email");
      if (!String(row.comuneResidenza ?? "").trim()) missingFields.push("comuneResidenza");
      if (!String(row.cap ?? "").trim()) missingFields.push("cap");

      if (missingFields.length > 0) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          message: `Campi obbligatori mancanti: ${missingFields.join(", ")}`,
        });
      }

      if (!isValidCodiceFiscale(String(row.codiceFiscale ?? ""))) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          field: "codiceFiscale",
          message: "Codice fiscale non valido",
        });
      }

      const sesso = sessoRaw === "M" || sessoRaw === "F" ? sessoRaw : null;
      if (sessoRaw && !sesso) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          field: "sesso",
          message: "Sesso non valido. Usa M o F",
        });
      }

      const email = emailRaw && emailRegex.test(emailRaw) ? emailRaw : null;
      if (emailRaw && !email) {
        errors.push({
          codiceFiscale: row.codiceFiscale,
          field: "email",
          message: "Email non valida",
        });
      }

      let parsedDate: Date | null = null;
      if (rawDate) {
        parsedDate = parseItalianDate(rawDate);
        if (!parsedDate) {
          errors.push({
            codiceFiscale: row.codiceFiscale,
            field: "dataNascita",
            message: `Data non valida: "${rawDate}". Usa il formato GG/MM/AAAA`,
          });
        }
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
            nome,
            cognome,
            sesso,
            dataNascita: parsedDate,
            luogoNascita: luogoNascita || null,
            email,
            telefono: String(row.telefono ?? "").trim() || null,
            cellulare: String(row.cellulare ?? "").trim() || null,
            indirizzo: String(row.indirizzo ?? "").trim() || null,
            comuneResidenza: String(row.comuneResidenza ?? "").trim() || null,
            cap: String(row.cap ?? "").trim() || null,
            mansione: String(row.mansione ?? "").trim() || null,
            note: String(row.note ?? "").trim() || null,
          },
          create: {
            clientId,
            nome,
            cognome,
            codiceFiscale: row.codiceFiscale as string,
            sesso,
            dataNascita: parsedDate,
            luogoNascita: luogoNascita || null,
            email,
            telefono: String(row.telefono ?? "").trim() || null,
            cellulare: String(row.cellulare ?? "").trim() || null,
            indirizzo: String(row.indirizzo ?? "").trim() || null,
            comuneResidenza: String(row.comuneResidenza ?? "").trim() || null,
            cap: String(row.cap ?? "").trim() || null,
            mansione: String(row.mansione ?? "").trim() || null,
            note: String(row.note ?? "").trim() || null,
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
