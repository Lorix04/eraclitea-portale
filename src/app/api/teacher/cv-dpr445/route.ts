import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFileName(firstName: string, lastName: string): string {
  const clean = (str: string) =>
    str
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  return `${clean(firstName)}_${clean(lastName)}_cv_dpr445.pdf`;
}

// ─── GET — Stato CV del docente ─────────────────────────────
export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const cvDpr = await prisma.teacherCvDpr445.findUnique({
    where: { teacherId: ctx.teacherId },
  });

  if (!cvDpr) {
    return NextResponse.json({
      data: { status: "NOT_REQUESTED", formData: null },
    });
  }

  return NextResponse.json({
    data: {
      status: cvDpr.status,
      requestedAt: cvDpr.requestedAt,
      deadline: cvDpr.deadline,
      submittedAt: cvDpr.submittedAt,
      reviewedAt: cvDpr.reviewedAt,
      rejectionReason: cvDpr.rejectionReason,
      fileName: cvDpr.fileName,
      consensoPrivacy: cvDpr.consensoPrivacy,
      formData: {
        prerequisitoTitoloStudio: cvDpr.prerequisitoTitoloStudio,
        criterioSelezionato: cvDpr.criterioSelezionato,
        criterioSpecifica: cvDpr.criterioSpecifica,
        areeTematiche: cvDpr.areeTematiche,
        documentazioneProbante: cvDpr.documentazioneProbante,
        abilitazioneAttrezzature: cvDpr.abilitazioneAttrezzature,
        attrezzatureTeoriche: cvDpr.attrezzatureTeoriche,
        attrezzaturePratiche: cvDpr.attrezzaturePratiche,
        abilitazioneAmbientiConfinati: cvDpr.abilitazioneAmbientiConfinati,
        abilitazioneAntincendio: cvDpr.abilitazioneAntincendio,
        antincendioIpotesi: cvDpr.antincendioIpotesi,
        abilitazionePonteggi: cvDpr.abilitazionePonteggi,
        abilitazioneFuni: cvDpr.abilitazioneFuni,
        abilitazioneSegnaleticaStradale: cvDpr.abilitazioneSegnaleticaStradale,
        abilitazioneDiisocianati: cvDpr.abilitazioneDiisocianati,
        abilitazioneHACCP: cvDpr.abilitazioneHACCP,
        abilitazionePrimoSoccorso: cvDpr.abilitazionePrimoSoccorso,
        abilitazionePESPAVPEI: cvDpr.abilitazionePESPAVPEI,
      },
    },
  });
}

// ─── PUT — Docente invia il CV ──────────────────────────────
export async function PUT(request: Request) {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const cvDpr = await prisma.teacherCvDpr445.findUnique({
    where: { teacherId: ctx.teacherId },
    select: { id: true, status: true, filePath: true },
  });

  if (!cvDpr || (cvDpr.status !== "REQUESTED" && cvDpr.status !== "REJECTED")) {
    return NextResponse.json(
      { error: "Non puoi inviare il CV in questo stato" },
      { status: 400 }
    );
  }

  // Fetch teacher name for filename
  const teacher = await prisma.teacher.findUnique({
    where: { id: ctx.teacherId },
    select: { firstName: true, lastName: true },
  });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Il file supera il limite di 5MB. Riduci la dimensione del PDF e riprova." },
        { status: 400 }
      );
    }

    // Validate extension
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Formato non supportato. Carica un file PDF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes
    if (buffer.length < 4 || buffer.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json(
        { error: "Il file non e un PDF valido." },
        { status: 400 }
      );
    }

    // Delete old file if exists
    if (cvDpr.filePath) {
      const storagePath = process.env.FILE_STORAGE_PATH || process.env.STORAGE_PATH || "storage";
      const oldFullPath = path.join(storagePath, cvDpr.filePath);
      await fs.unlink(oldFullPath).catch(() => {});
    }

    // Save with sanitized name
    const storagePath = process.env.FILE_STORAGE_PATH || process.env.STORAGE_PATH || "storage";
    const dir = path.join(storagePath, "cv-dpr445", ctx.teacherId);
    await fs.mkdir(dir, { recursive: true });

    const savedName = sanitizeFileName(
      teacher?.firstName || "Docente",
      teacher?.lastName || "Sconosciuto"
    );
    const fullPath = path.join(dir, savedName);
    await fs.writeFile(fullPath, buffer);

    filePath = path.join("cv-dpr445", ctx.teacherId, savedName);
    fileName = savedName;
    fileSize = buffer.length;
  }

  // Parse form data fields
  const getField = (key: string) => {
    const val = formData.get(key);
    return val ? String(val) : null;
  };
  const getBool = (key: string) => formData.get(key) === "true";
  const getArray = (key: string) => {
    const val = formData.get(key);
    if (!val) return [];
    try {
      return JSON.parse(String(val));
    } catch {
      return String(val).split(",").filter(Boolean);
    }
  };

  const updateData: any = {
    status: "SUBMITTED",
    submittedAt: new Date(),
    // Form fields
    prerequisitoTitoloStudio: getField("prerequisitoTitoloStudio"),
    criterioSelezionato: getField("criterioSelezionato") ? parseInt(getField("criterioSelezionato")!) : null,
    criterioSpecifica: getField("criterioSpecifica"),
    areeTematiche: getArray("areeTematiche"),
    documentazioneProbante: getArray("documentazioneProbante"),
    abilitazioneAttrezzature: getBool("abilitazioneAttrezzature"),
    attrezzatureTeoriche: getArray("attrezzatureTeoriche"),
    attrezzaturePratiche: getArray("attrezzaturePratiche"),
    abilitazioneAmbientiConfinati: getBool("abilitazioneAmbientiConfinati"),
    ambientiConfinatiTipo: getField("ambientiConfinatiTipo"),
    abilitazionePonteggi: getBool("abilitazionePonteggi"),
    abilitazioneFuni: getBool("abilitazioneFuni"),
    abilitazioneSegnaleticaStradale: getBool("abilitazioneSegnaleticaStradale"),
    abilitazioneAntincendio: getBool("abilitazioneAntincendio"),
    antincendioIpotesi: getField("antincendioIpotesi"),
    abilitazioneDiisocianati: getBool("abilitazioneDiisocianati"),
    abilitazioneHACCP: getBool("abilitazioneHACCP"),
    abilitazionePrimoSoccorso: getBool("abilitazionePrimoSoccorso"),
    primoSoccorsoTipo: getArray("primoSoccorsoTipo"),
    abilitazionePESPAVPEI: getBool("abilitazionePESPAVPEI"),
    consensoPrivacy: getBool("consensoPrivacy"),
  };

  if (filePath) {
    updateData.filePath = filePath;
    updateData.fileName = fileName;
    updateData.fileSize = fileSize;
  }

  await prisma.teacherCvDpr445.update({
    where: { teacherId: ctx.teacherId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
