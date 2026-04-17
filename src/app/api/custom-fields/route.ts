import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { getCustomFieldsForEdition, getCustomFieldsForClient } from "@/lib/custom-field-resolver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(request.url);
  const editionId = url.searchParams.get("editionId");

  // If editionId is provided, resolve fields for that specific edition
  if (editionId) {
    const result = await getCustomFieldsForEdition(editionId);
    return NextResponse.json(result);
  }

  // Otherwise, resolve for the client (legacy behavior)
  let clientId: string | null = null;

  if (session.user.role === "ADMIN") {
    clientId = url.searchParams.get("clientId");
  }

  if (!clientId) {
    const ctx = await getEffectiveClientContext();
    if (ctx) {
      clientId = ctx.clientId;
    }
  }

  if (!clientId) {
    return NextResponse.json({ enabled: false, fields: [] });
  }

  const result = await getCustomFieldsForClient(clientId);
  return NextResponse.json(result);
}
