import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { encrypt, decrypt } from "@/lib/encryption";

function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return key.slice(0, 5) + "***..." + key.slice(-3);
}

export async function GET() {
  const check = await requirePermission("integrazioni-ai", "view");
  if (check instanceof NextResponse) return check;

  const config = await prisma.aiConfig.findUnique({
    where: { id: "singleton" },
  });

  if (!config) {
    return NextResponse.json({
      provider: "openrouter",
      hasApiKey: false,
      apiKeyMasked: "",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      modelName: "Llama 3.3 70B Instruct (Free)",
      isEnabled: false,
    });
  }

  let masked = "";
  try {
    const decrypted = decrypt(config.apiKey);
    masked = maskKey(decrypted);
  } catch {
    masked = "***errore decrittazione***";
  }

  return NextResponse.json({
    provider: config.provider,
    hasApiKey: true,
    apiKeyMasked: masked,
    model: config.model,
    modelName: config.modelName,
    isEnabled: config.isEnabled,
  });
}

export async function PUT(request: Request) {
  const check = await requirePermission("integrazioni-ai", "edit");
  if (check instanceof NextResponse) return check;

  const body = await request.json();
  const { apiKey, model, modelName, isEnabled } = body;

  const existing = await prisma.aiConfig.findUnique({
    where: { id: "singleton" },
  });

  const encryptedKey =
    apiKey && apiKey.trim()
      ? encrypt(apiKey.trim())
      : existing?.apiKey ?? "";

  if (!encryptedKey) {
    return NextResponse.json(
      { error: "Inserisci una chiave API" },
      { status: 400 }
    );
  }

  await prisma.aiConfig.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      provider: "openrouter",
      apiKey: encryptedKey,
      model: model || "meta-llama/llama-3.3-70b-instruct:free",
      modelName: modelName || null,
      isEnabled: isEnabled ?? true,
    },
    update: {
      apiKey: encryptedKey,
      model: model || undefined,
      modelName: modelName !== undefined ? modelName : undefined,
      isEnabled: isEnabled !== undefined ? isEnabled : undefined,
    },
  });

  return NextResponse.json({ success: true });
}
