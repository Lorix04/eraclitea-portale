import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: {
      ragioneSociale: true,
      primaryColor: true,
      secondaryColor: true,
      sidebarBgColor: true,
      sidebarTextColor: true,
      logoPath: true,
      logoLightPath: true,
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const buildLogoUrl = (path?: string | null) =>
    path ? `/api/storage/clients/${path.replace(/\\/g, "/")}` : null;

  return NextResponse.json({
    clientName: client.ragioneSociale,
    primaryColor: client.primaryColor ?? null,
    secondaryColor: client.secondaryColor ?? null,
    sidebarBgColor: client.sidebarBgColor ?? null,
    sidebarTextColor: client.sidebarTextColor ?? null,
    logoUrl: buildLogoUrl(client.logoPath),
    logoLightUrl: buildLogoUrl(client.logoLightPath),
  });
}
