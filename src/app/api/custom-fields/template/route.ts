import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { getCustomFieldsForEdition, getCustomFieldsForClient } from "@/lib/custom-field-resolver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(request.url);
  const editionId = url.searchParams.get("editionId");
  let clientId = url.searchParams.get("clientId");

  if (!clientId) {
    const ctx = await getEffectiveClientContext();
    if (ctx) clientId = ctx.clientId;
  }

  // Resolve fields from edition or client
  let cfResult: { enabled: boolean; fields: Array<{ label: string; columnHeader: string | null; required: boolean }> };
  if (editionId) {
    cfResult = await getCustomFieldsForEdition(editionId);
  } else if (clientId) {
    cfResult = await getCustomFieldsForClient(clientId);
  } else {
    return NextResponse.json({ error: "ClientId o editionId mancante" }, { status: 400 });
  }

  const fields = cfResult.fields;
  if (fields.length === 0) {
    return NextResponse.json(
      { error: "Nessun campo configurato" },
      { status: 400 }
    );
  }

  // Build headers — required fields get asterisk
  const headers = fields.map(
    (f) => `${f.columnHeader || f.label}${f.required ? " *" : ""}`
  );

  // Fetch client name for filename
  const client = clientId
    ? await prisma.client.findUnique({
        where: { id: clientId },
        select: { ragioneSociale: true },
      })
    : null;
  const clientName = (client?.ragioneSociale || "cliente")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 30);

  // Generate Excel with styled headers
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);

  // Set column widths
  worksheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.length + 2, 15),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, "Anagrafiche");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Template_Anagrafiche_${clientName}.xlsx"`,
    },
  });
}
