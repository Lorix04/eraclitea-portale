import { NextResponse } from "next/server";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { parseOpenRouterError } from "@/lib/ai-errors";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EXTRACTION_PROMPT = `Analizza il seguente testo estratto da un CV e restituisci SOLO un oggetto JSON valido (senza markdown, senza backtick, senza commenti) con questa struttura esatta:

{
  "workExperiences": [
    {
      "jobTitle": "string",
      "employer": "string",
      "city": "string o null",
      "sector": "string o null",
      "startDate": "YYYY-MM-01 o null",
      "endDate": "YYYY-MM-01 o null",
      "isCurrent": false,
      "description": "string o null"
    }
  ],
  "educations": [
    {
      "title": "string",
      "institution": "string",
      "fieldOfStudy": "string o null",
      "city": "string o null",
      "startDate": "YYYY-MM-01 o null",
      "endDate": "YYYY-MM-01 o null",
      "grade": "string o null",
      "description": "string o null"
    }
  ],
  "languages": [
    {
      "language": "string",
      "isNative": false,
      "listening": "A1|A2|B1|B2|C1|C2 o null",
      "reading": "A1|A2|B1|B2|C1|C2 o null",
      "speaking": "A1|A2|B1|B2|C1|C2 o null",
      "writing": "A1|A2|B1|B2|C1|C2 o null",
      "certificate": "string o null"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuingBody": "string",
      "issueDate": "YYYY-MM-01 o null",
      "expiryDate": "YYYY-MM-01 o null",
      "credentialId": "string o null",
      "description": "string o null"
    }
  ],
  "skills": [
    {
      "name": "string",
      "category": "Digitale|Tecnica|Software|Gestionale|Altro",
      "level": "Base|Intermedio|Avanzato|Esperto"
    }
  ],
  "trainingCourses": [
    {
      "title": "string",
      "provider": "string o null",
      "date": "YYYY-MM-01 o null",
      "durationHours": null,
      "topic": "string o null",
      "certificate": false
    }
  ],
  "teachingExperiences": [
    {
      "courseTitle": "string",
      "topic": "string o null",
      "organization": "string o null",
      "targetAudience": "string o null",
      "startDate": "YYYY-MM-01 o null",
      "endDate": "YYYY-MM-01 o null",
      "totalHours": null,
      "location": "string o null",
      "description": "string o null"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string o null",
      "date": "YYYY-MM-01 o null",
      "url": "string o null",
      "description": "string o null"
    }
  ]
}

Regole:
- Estrai SOLO informazioni presenti nel testo, non inventare
- Se una sezione non ha dati, usa un array vuoto []
- Per le date usa formato YYYY-MM-01 (es: "2020-03-01")
- Se la data ha solo l'anno, usa YYYY-01-01 (es: "2020-01-01")
- Per le competenze, deduci il livello dal contesto se non esplicito
- Separa le esperienze come docente/formatore dalle altre esperienze lavorative
- Per le lingue, se i livelli non sono specificati, omettili (null)
- Tutti i campi stringa devono essere in italiano
- isCurrent deve essere true solo se l'esperienza è chiaramente in corso (es: "attuale", "in corso", "presente")

Testo del CV:
`;

export async function POST(request: Request) {
  try {
    // Check auth
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const teacherId = ctx.teacherId;
    const userId = ctx.userId;

    // Check AI config from DB
    const aiConfig = await prisma.aiConfig.findUnique({
      where: { id: "singleton" },
    });

    if (!aiConfig || !aiConfig.isEnabled || !aiConfig.apiKey) {
      return NextResponse.json(
        { error: "La funzionalita AI non e configurata. Contatta l'amministratore." },
        { status: 503 }
      );
    }

    let decryptedKey: string;
    try {
      decryptedKey = decrypt(aiConfig.apiKey);
    } catch {
      return NextResponse.json(
        { error: "Errore nella configurazione AI. Contatta l'amministratore." },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nessun file caricato" }, { status: 400 });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File troppo grande (max 10MB)" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Solo file PDF supportati" }, { status: 400 });
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate PDF magic bytes
    if (buffer.length < 5 || buffer.toString("utf8", 0, 5) !== "%PDF-") {
      return NextResponse.json({ error: "Il file non sembra essere un PDF valido" }, { status: 400 });
    }

    let text: string;
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } catch (err) {
      console.error("[CV_IMPORT] PDF parse error:", err);
      return NextResponse.json(
        { error: "Impossibile leggere il PDF. Verifica che non sia protetto da password." },
        { status: 400 }
      );
    }

    // Check text length
    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Il PDF sembra essere un'immagine scansionata o non contiene testo sufficiente. Carica un PDF con testo selezionabile.",
        },
        { status: 400 }
      );
    }

    // Truncate if very long
    const maxChars = 30000;
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    // Call OpenRouter API
    const startTime = Date.now();
    let aiResponse: Response;

    try {
      aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${decryptedKey}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL || "https://sapienta.it",
          "X-Title": "Portale Sapienta",
        },
        body: JSON.stringify({
          model: aiConfig.model,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: EXTRACTION_PROMPT + truncatedText,
            },
          ],
        }),
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await prisma.aiCallLog.create({
        data: {
          action: "cv_import",
          model: aiConfig.model,
          status: "error",
          errorMessage: `Network error: ${err.message}`,
          durationMs,
          userId,
          teacherId,
        },
      });
      return NextResponse.json(
        { error: "Impossibile contattare il servizio AI. Riprova piu tardi." },
        { status: 502 }
      );
    }

    const durationMs = Date.now() - startTime;

    const aiResponseText = await aiResponse.text();
    let aiData: any;
    try {
      aiData = JSON.parse(aiResponseText);
    } catch {
      console.error("[CV_IMPORT] Non-JSON response:", aiResponse.status, aiResponseText.substring(0, 300));
      await prisma.aiCallLog.create({
        data: {
          action: "cv_import",
          model: aiConfig.model,
          status: "error",
          errorMessage: `Non-JSON response: HTTP ${aiResponse.status}`,
          durationMs,
          userId,
          teacherId,
        },
      });
      return NextResponse.json(
        { error: "Risposta non valida dal servizio AI. Riprova." },
        { status: 502 }
      );
    }

    if (!aiResponse.ok || aiData.error) {
      const userMessage = parseOpenRouterError(aiResponse.status, aiData);
      console.error("[CV_IMPORT] AI API error:", aiResponse.status, aiData?.error);
      await prisma.aiCallLog.create({
        data: {
          action: "cv_import",
          model: aiConfig.model,
          status: "error",
          errorMessage: aiData?.error?.message || `HTTP ${aiResponse.status}`,
          durationMs,
          userId,
          teacherId,
        },
      });
      return NextResponse.json(
        { error: userMessage },
        { status: 502 }
      );
    }
    const extractedText = aiData.choices?.[0]?.message?.content;

    if (!extractedText) {
      await prisma.aiCallLog.create({
        data: {
          action: "cv_import",
          model: aiConfig.model,
          status: "error",
          errorMessage: "Empty response from model",
          durationMs,
          userId,
          teacherId,
        },
      });
      return NextResponse.json(
        { error: "Nessuna risposta dall'analisi AI. Riprova." },
        { status: 502 }
      );
    }

    // Parse JSON from AI response
    let cvData: any;
    try {
      const cleanJson = extractedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      cvData = JSON.parse(cleanJson);
    } catch {
      console.error("[CV_IMPORT] JSON parse error. AI response:", extractedText.slice(0, 500));
      await prisma.aiCallLog.create({
        data: {
          action: "cv_import",
          model: aiConfig.model,
          status: "error",
          errorMessage: "Invalid JSON in response",
          inputTokens: aiData.usage?.prompt_tokens,
          outputTokens: aiData.usage?.completion_tokens,
          durationMs,
          userId,
          teacherId,
        },
      });
      return NextResponse.json(
        { error: "Errore nell'analisi del CV. Riprova o compila i dati manualmente." },
        { status: 500 }
      );
    }

    // Log success
    await prisma.aiCallLog.create({
      data: {
        action: "cv_import",
        model: aiConfig.model,
        status: "success",
        inputTokens: aiData.usage?.prompt_tokens,
        outputTokens: aiData.usage?.completion_tokens,
        durationMs,
        userId,
        teacherId,
      },
    });

    // Ensure all sections are arrays
    const sections = [
      "workExperiences",
      "educations",
      "languages",
      "certifications",
      "skills",
      "trainingCourses",
      "teachingExperiences",
      "publications",
    ] as const;

    for (const s of sections) {
      if (!Array.isArray(cvData[s])) cvData[s] = [];
    }

    // Build stats
    const stats: Record<string, number> = {};
    for (const s of sections) {
      stats[s] = cvData[s].length;
    }

    return NextResponse.json({
      success: true,
      data: cvData,
      stats,
    });
  } catch (error) {
    console.error("[CV_IMPORT_PDF] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
