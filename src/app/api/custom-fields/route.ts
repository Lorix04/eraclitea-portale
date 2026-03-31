import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let clientId: string | null = null;

  // Admin can pass clientId as query param
  if (session.user.role === "ADMIN") {
    const url = new URL(request.url);
    clientId = url.searchParams.get("clientId");
  }

  // Client uses their own clientId via effective context
  if (!clientId) {
    const ctx = await getEffectiveClientContext();
    if (ctx) {
      clientId = ctx.clientId;
    }
  }

  if (!clientId) {
    return NextResponse.json({ enabled: false, fields: [] });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { hasCustomFields: true },
  });

  if (!client?.hasCustomFields) {
    return NextResponse.json({ enabled: false, fields: [] });
  }

  const fields = await prisma.clientCustomField.findMany({
    where: { clientId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      label: true,
      type: true,
      required: true,
      placeholder: true,
      options: true,
      defaultValue: true,
      sortOrder: true,
      columnHeader: true,
      standardField: true,
    },
  });

  return NextResponse.json({ enabled: true, fields });
}
