import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCodiceFiscale } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawCf = searchParams.get("cf");
  if (!rawCf) {
    return NextResponse.json({ data: null });
  }

  const normalizedCF = normalizeCodiceFiscale(rawCf);
  if (normalizedCF.length !== 16) {
    return NextResponse.json({ data: null });
  }

  const clientId =
    session.user.role === "ADMIN"
      ? searchParams.get("clientId")
      : session.user.clientId;

  if (!clientId) {
    return NextResponse.json({ data: null });
  }

  const employee = await prisma.employee.findUnique({
    where: {
      clientId_codiceFiscale: {
        clientId,
        codiceFiscale: normalizedCF,
      },
    },
    select: {
      id: true,
      nome: true,
      cognome: true,
      codiceFiscale: true,
      sesso: true,
      dataNascita: true,
      luogoNascita: true,
      email: true,
      telefono: true,
      cellulare: true,
      indirizzo: true,
      comuneResidenza: true,
      cap: true,
      mansione: true,
      note: true,
    },
  });

  return NextResponse.json({ data: employee });
}
