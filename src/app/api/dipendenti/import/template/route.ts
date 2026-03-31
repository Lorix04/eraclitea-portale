import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TEMPLATE_HEADERS = [
  "nome",
  "cognome",
  "codice_fiscale",
  "sesso",
  "data_nascita",
  "comune_nascita",
  "email",
  "comune_residenza",
  "cap",
  "provincia",
  "regione",
  "indirizzo",
  "telefono",
  "cellulare",
  "mansione",
  "email_aziendale",
  "pec",
  "partita_iva",
  "iban",
  "note",
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csvContent = `\uFEFF${TEMPLATE_HEADERS.join(";")}\r\n`;

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="template_import_dipendenti.csv"',
      "Cache-Control": "no-store",
    },
  });
}
