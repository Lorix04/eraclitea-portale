import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { decrypt } from "@/lib/encryption";
import { parseOpenRouterError } from "@/lib/ai-errors";

export async function POST(request: Request) {
  const check = await requirePermission("integrazioni-ai", "edit");
  if (check instanceof NextResponse) return check;

  const body = await request.json();
  let { apiKey, model } = body;

  // If no key provided, use saved one
  if (!apiKey || !apiKey.trim()) {
    const config = await prisma.aiConfig.findUnique({
      where: { id: "singleton" },
    });
    if (!config?.apiKey) {
      return NextResponse.json({
        success: false,
        message: "Nessuna chiave API configurata",
      });
    }
    try {
      apiKey = decrypt(config.apiKey);
    } catch {
      return NextResponse.json({
        success: false,
        message: "Errore nella decrittazione della chiave salvata",
      });
    }
    if (!model) model = config.model;
  }

  if (!model) model = "meta-llama/llama-3.3-70b-instruct:free";

  const startTime = Date.now();
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL || "https://sapienta.it",
          "X-Title": "Portale Sapienta",
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          messages: [
            { role: "user", content: 'Rispondi solo con la parola "OK".' },
          ],
        }),
      }
    );
    const durationMs = Date.now() - startTime;

    const responseText = await response.text();
    console.log(
      "[AI_TEST] Status:",
      response.status,
      "Body:",
      responseText.substring(0, 500)
    );

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        success: false,
        message: `Risposta non valida da OpenRouter: ${responseText.substring(0, 200)}`,
        responseTime: durationMs,
      });
    }

    if (!response.ok || data.error) {
      return NextResponse.json({
        success: false,
        message: parseOpenRouterError(response.status, data),
        responseTime: durationMs,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Connessione riuscita",
      responseTime: durationMs,
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      message: `Errore di rete: ${err.message}`,
      responseTime: durationMs,
    });
  }
}
