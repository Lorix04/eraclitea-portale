import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { isValidCodiceFiscale, normalizeCodiceFiscale } from "@/lib/validators";
import { validateFiscalCodeAgainstData } from "@/lib/fiscal-code-utils";
import { validateBody } from "@/lib/api-utils";

const schema = z.object({
  fiscalCode: z.string().trim().min(1),
  employeeId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  birthDate: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  birthPlace: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkApiPermission(session, "dipendenti", "view")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const validation = await validateBody(request, schema);
    if ("error" in validation) {
      return validation.error;
    }

    const payload = validation.data;
    const normalizedCF = normalizeCodiceFiscale(payload.fiscalCode);

    const clientId = payload.clientId ?? null;

    const isValid = normalizedCF.length === 16 && isValidCodiceFiscale(normalizedCF);
    if (!isValid) {
      return NextResponse.json({
        valid: false,
        mismatches: [],
        warnings: [],
        duplicate: false,
        duplicateEmployee: null,
      });
    }

    const fiscalValidation = validateFiscalCodeAgainstData(normalizedCF, {
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      birthDate: payload.birthDate ?? null,
      gender: payload.gender ?? null,
      birthPlace: payload.birthPlace ?? null,
    });

    let duplicateEmployee: { id: string; fullName: string; fiscalCode: string } | null = null;
    if (clientId) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          clientId,
          codiceFiscale: normalizedCF,
          ...(payload.employeeId
            ? { NOT: { id: payload.employeeId } }
            : {}),
        },
        select: {
          id: true,
          nome: true,
          cognome: true,
          codiceFiscale: true,
        },
      });

      if (duplicate) {
        duplicateEmployee = {
          id: duplicate.id,
          fullName: `${duplicate.nome ?? ""} ${duplicate.cognome ?? ""}`.trim(),
          fiscalCode: duplicate.codiceFiscale ?? "",
        };
      }
    }

    return NextResponse.json({
      valid: fiscalValidation.isValid,
      mismatches: fiscalValidation.mismatches,
      warnings: fiscalValidation.warnings,
      duplicate: Boolean(duplicateEmployee),
      duplicateEmployee,
    });
  } catch (error) {
    console.error("[ADMIN_EMPLOYEE_VALIDATE_CF] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
