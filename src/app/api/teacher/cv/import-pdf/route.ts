import { NextResponse } from "next/server";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

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

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Funzionalità di importazione AI non configurata" },
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
      // Dynamic import for pdf-parse
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

    // Truncate if very long (Claude has a context limit)
    const maxChars = 30000;
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: EXTRACTION_PROMPT + truncatedText,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      console.error("[CV_IMPORT] Claude API error:", claudeResponse.status, await claudeResponse.text().catch(() => ""));
      return NextResponse.json(
        { error: "Impossibile analizzare il CV al momento. Riprova più tardi." },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const extractedText = claudeData.content?.[0]?.text;
    if (!extractedText) {
      return NextResponse.json(
        { error: "Nessuna risposta dall'analisi AI. Riprova." },
        { status: 502 }
      );
    }

    // Parse JSON from Claude response
    let cvData: any;
    try {
      const cleanJson = extractedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      cvData = JSON.parse(cleanJson);
    } catch {
      console.error("[CV_IMPORT] JSON parse error. Claude response:", extractedText.slice(0, 500));
      return NextResponse.json(
        { error: "Errore nell'analisi del CV. Riprova o compila i dati manualmente." },
        { status: 500 }
      );
    }

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
