import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.aiConfig.findUnique({
      where: { id: "singleton" },
      select: { isEnabled: true, apiKey: true },
    });

    return NextResponse.json({
      cvImportEnabled: !!(config && config.isEnabled && config.apiKey),
    });
  } catch {
    return NextResponse.json({ cvImportEnabled: false });
  }
}
