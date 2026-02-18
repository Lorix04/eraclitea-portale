import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const effectiveUser = await getEffectiveUserId();
    if (!effectiveUser?.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { id: effectiveUser.clientId },
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
  } catch (error) {
    console.error("[BRANDING_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
