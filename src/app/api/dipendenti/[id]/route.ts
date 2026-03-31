import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { parseItalianDate } from "@/lib/date-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { validateBody } from "@/lib/api-utils";
import { isValidCodiceFiscale, normalizeCodiceFiscale } from "@/lib/validators";
import { validateFiscalCodeAgainstData } from "@/lib/fiscal-code-utils";

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
  codiceFiscale: z
    .string()
    .trim()
    .length(16, "Il codice fiscale deve essere di 16 caratteri")
    .optional(),
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
  provincia: optionalString(100),
  regione: optionalString(100),
  emailAziendale: optionalString(255),
  pec: optionalString(255),
  partitaIva: optionalString(20),
  iban: optionalString(50),
  mansione: optionalString(100),
  note: optionalString(500),
  force: z.boolean().optional(),
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
  try {
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
    const isAdmin = session.user.role === "ADMIN";
    const force = Boolean(payload.force);

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

    const normalizedCF = payload.codiceFiscale
      ? normalizeCodiceFiscale(payload.codiceFiscale)
      : employee.codiceFiscale;
    if (!normalizedCF || !isValidCodiceFiscale(normalizedCF)) {
      return NextResponse.json(
        { error: "Codice fiscale non valido" },
        { status: 400 }
      );
    }

    const fiscalCodeChanged = normalizedCF !== employee.codiceFiscale;
    const mismatches: string[] = [];
    const warnings: string[] = [];
    let duplicateEmployee:
      | { id: string; nome: string | null; cognome: string | null; codiceFiscale: string | null }
      | null = null;

    if (fiscalCodeChanged) {
      const fiscalValidation = validateFiscalCodeAgainstData(normalizedCF, {
        firstName: payload.nome,
        lastName: payload.cognome,
        birthDate: parsedDate ?? payload.dataNascita,
        gender: payload.sesso,
        birthPlace: payload.luogoNascita,
      });

      mismatches.push(...fiscalValidation.mismatches);
      warnings.push(...fiscalValidation.warnings);

      const duplicate = await prisma.employee.findFirst({
        where: {
          clientId: employee.clientId,
          codiceFiscale: normalizedCF,
          NOT: { id: employee.id },
        },
        select: {
          id: true,
          nome: true,
          cognome: true,
          codiceFiscale: true,
        },
      });

      if (duplicate) {
        duplicateEmployee = duplicate;
      }

      if (!isAdmin) {
        if (mismatches.length > 0) {
          return NextResponse.json(
            {
              error: "Il codice fiscale non corrisponde ai dati anagrafici",
              mismatches,
              warnings,
            },
            { status: 400 }
          );
        }
        if (duplicateEmployee) {
          return NextResponse.json(
            {
              error: "Esiste già un dipendente con questo codice fiscale",
              duplicate: true,
              duplicateEmployee: {
                id: duplicateEmployee.id,
                fullName: `${duplicateEmployee.nome} ${duplicateEmployee.cognome}`,
                fiscalCode: duplicateEmployee.codiceFiscale,
              },
            },
            { status: 400 }
          );
        }
      } else if ((mismatches.length > 0 || duplicateEmployee) && !force) {
        return NextResponse.json(
          {
            error: duplicateEmployee
              ? "Codice fiscale duplicato"
              : "Il codice fiscale non corrisponde ai dati anagrafici",
            canForce: true,
            mismatches,
            warnings,
            duplicate: Boolean(duplicateEmployee),
            duplicateEmployee: duplicateEmployee
              ? {
                  id: duplicateEmployee.id,
                  fullName: `${duplicateEmployee.nome} ${duplicateEmployee.cognome}`,
                  fiscalCode: duplicateEmployee.codiceFiscale,
                }
              : null,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: {
        nome: payload.nome,
        cognome: payload.cognome,
        codiceFiscale: normalizedCF,
        sesso: payload.sesso,
        email: payload.email,
        telefono: toNullableField(payload.telefono as string | null | undefined),
        cellulare: toNullableField(payload.cellulare as string | null | undefined),
        indirizzo: toNullableField(payload.indirizzo as string | null | undefined),
        comuneResidenza: payload.comuneResidenza,
        cap: payload.cap,
        provincia: toNullableField(payload.provincia as string | null | undefined),
        regione: toNullableField(payload.regione as string | null | undefined),
        emailAziendale: toNullableField(
          payload.emailAziendale as string | null | undefined
        ),
        pec: toNullableField(payload.pec as string | null | undefined),
        partitaIva: toNullableField(payload.partitaIva as string | null | undefined),
        iban: toNullableField(payload.iban as string | null | undefined),
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

    const responseWarnings = [
      ...warnings,
      ...mismatches,
      ...(duplicateEmployee
        ? [
            `Codice fiscale già assegnato a ${duplicateEmployee.nome} ${duplicateEmployee.cognome}`,
          ]
        : []),
    ];

    return NextResponse.json({
      data: updated,
      success: true,
      warnings: isAdmin && force ? responseWarnings : [],
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Esiste già un dipendente con questo codice fiscale" },
        { status: 409 }
      );
    }
    console.error("[EMPLOYEE_PUT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
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
