import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { decrypt } from "@/lib/encryption";

let modelsCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const check = await requirePermission("integrazioni-ai", "view");
  if (check instanceof NextResponse) return check;

  if (modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
    return NextResponse.json({ models: modelsCache.data });
  }

  const config = await prisma.aiConfig.findUnique({
    where: { id: "singleton" },
  });

  if (!config?.apiKey) {
    return NextResponse.json(
      { error: "Configura prima la chiave API" },
      { status: 400 }
    );
  }

  let decryptedKey: string;
  try {
    decryptedKey = decrypt(config.apiKey);
  } catch {
    return NextResponse.json(
      { error: "Errore nella decrittazione della chiave" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${decryptedKey}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Impossibile caricare i modelli. Verifica la chiave API." },
        { status: response.status }
      );
    }

    const data = await response.json();

    const models = (data.data || [])
      .map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        isFree:
          parseFloat(m.pricing?.prompt || "1") === 0 &&
          parseFloat(m.pricing?.completion || "1") === 0,
        contextLength: m.context_length || 0,
        pricingPrompt: m.pricing?.prompt || "0",
        pricingCompletion: m.pricing?.completion || "0",
      }))
      .filter((m: any) => m.contextLength >= 4096)
      .sort((a: any, b: any) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

    modelsCache = { data: models, timestamp: Date.now() };

    return NextResponse.json({ models });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Errore di rete: ${err.message}` },
      { status: 500 }
    );
  }
}
