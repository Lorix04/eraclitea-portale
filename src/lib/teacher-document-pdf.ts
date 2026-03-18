import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const DECLARATIONS = [
  "di essere in possesso di un'esperienza lavorativa di oltre 5 anni nell'ambito formazione in materia di salute e sicurezza sui luoghi di lavoro",
  "di essere in possesso dei requisiti previsti dal Decreto interministeriale del 6 marzo 2013",
  "di essere in possesso dei requisiti previsti dal Decreto Ministeriale del 02 Settembre 2021 quale docente per svolgimento dei corsi antincendio come docente di parte teorica e pratica",
  "di essere in possesso dei requisiti previsti dall'Accordo Stato Regioni del 17 aprile 2025 quale docente per lo svolgimento dei corsi di formazione sulle attrezzature da lavoro",
  "di essere in possesso dei requisiti previsti dal DM 388/2003 quale docente per lo svolgimento dei corsi di formazione per il primo soccorso",
];

function formatDateIT(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// pdf-lib doesn't have auto word-wrap, so we implement it
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateAttoNotorietaPdf(data: {
  teacher: {
    firstName: string;
    lastName: string;
    birthDate: string;
    birthPlace: string;
    city: string;
    address?: string;
    postalCode?: string;
    province?: string;
  };
  declarations: boolean[];
  privacyAccepted: boolean;
  signatureImage: string;
  place: string;
  date: string;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(
    `Atto di Notorieta - ${data.teacher.lastName} ${data.teacher.firstName}`
  );
  doc.setAuthor("Portale Sapienta");
  doc.setCreator("Portale Sapienta");

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page = doc.addPage([595.28, 841.89]); // A4
  const margin = 60;
  const contentWidth = page.getWidth() - margin * 2;
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let y = page.getHeight() - margin;

  // Helper: draw text and advance y
  function drawText(
    text: string,
    opts: {
      font?: typeof helvetica;
      size?: number;
      color?: typeof black;
      align?: "left" | "center";
      x?: number;
      maxWidth?: number;
    } = {}
  ) {
    const font = opts.font ?? helvetica;
    const size = opts.size ?? 10;
    const color = opts.color ?? black;
    const maxW = opts.maxWidth ?? contentWidth;
    const lines = wrapText(text, font, size, maxW);

    for (const line of lines) {
      let x = opts.x ?? margin;
      if (opts.align === "center") {
        const w = font.widthOfTextAtSize(line, size);
        x = margin + (contentWidth - w) / 2;
      }
      page.drawText(line, { x, y, size, font, color });
      y -= size * 1.5;
    }
  }

  function drawLine() {
    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      thickness: 0.5,
      color: gray,
    });
    y -= 12;
  }

  function addSpace(pts: number) {
    y -= pts;
  }

  // Compute display values
  const fullName = `${data.teacher.lastName.toUpperCase()} ${data.teacher.firstName.toUpperCase()}`;
  const birthPlace = data.teacher.birthPlace?.toUpperCase() || "___";
  const birthDate = formatDateIT(data.teacher.birthDate);
  const fullResidence =
    [
      data.teacher.address,
      [data.teacher.postalCode, data.teacher.city].filter(Boolean).join(" "),
      data.teacher.province ? `(${data.teacher.province})` : "",
    ]
      .filter(Boolean)
      .join(", ")
      .toUpperCase() || "___";

  // ===== TITLE =====
  drawText("DICHIARAZIONE SOSTITUTIVA DELL'ATTO DI NOTORIETA", {
    font: helveticaBold,
    size: 13,
    align: "center",
  });
  addSpace(2);
  drawText("(Art. 46 D.P.R. 445 del 28 dicembre 2000)", {
    size: 9,
    align: "center",
    color: gray,
  });
  addSpace(16);

  // ===== DECLARANT =====
  const declarantText = `Il sottoscritto ${fullName}, nato a ${birthPlace} il ${birthDate}, residente a ${fullResidence}`;
  const declarantLines = wrapText(declarantText, helvetica, 10, contentWidth);
  for (const line of declarantLines) {
    // Bold the proper names inline isn't feasible with pdf-lib's simple API,
    // so we render the whole line in regular and it reads fine as a legal document
    page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: black });
    y -= 15;
  }
  addSpace(8);

  // ===== WARNING =====
  drawText(
    "consapevole delle sanzioni penali, nel caso di dichiarazioni non veritiere, di formazione o uso di atti falsi, richiamate dall'art. 76 del D.P.R. 445 del 28 dicembre 2000",
    { font: helveticaOblique, size: 9, color: gray }
  );
  addSpace(14);

  // ===== DICHIARO =====
  drawText("DICHIARO", { font: helveticaBold, size: 13, align: "center" });
  addSpace(2);
  drawText("(flaggare la/e casella/e di propria pertinenza)", {
    size: 8,
    align: "center",
    color: gray,
  });
  addSpace(12);

  // ===== DECLARATIONS =====
  for (let i = 0; i < DECLARATIONS.length; i++) {
    const checked = data.declarations[i] ?? false;
    const prefix = checked ? "[X] " : "[  ] ";
    const text = prefix + DECLARATIONS[i];
    drawText(text, { size: 9, x: margin + 10, maxWidth: contentWidth - 10 });
    addSpace(6);
  }

  addSpace(6);
  drawLine();
  addSpace(4);

  // ===== PRIVACY =====
  const privacyPrefix = data.privacyAccepted ? "[X] " : "[  ] ";
  drawText(
    privacyPrefix +
      "Dichiaro di essere informato, ai sensi e per gli effetti di cui al D. Lgs. 196/2003 e del regolamento EU 679/2016 che i dati personali raccolti saranno trattati, anche con strumenti informatici, esclusivamente nell'ambito del procedimento per il quale la presente dichiarazione viene resa.",
    { size: 9, x: margin + 10, maxWidth: contentWidth - 10 }
  );
  addSpace(20);

  // ===== PLACE AND DATE =====
  drawText(`Luogo e Data: ${data.place}, ${formatDateIT(data.date)}`, {
    size: 10,
  });
  addSpace(16);

  // ===== SIGNATURE =====
  drawText("Firma:", { size: 10 });
  addSpace(6);

  if (data.signatureImage) {
    try {
      const base64 = data.signatureImage.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const imgBytes = Uint8Array.from(Buffer.from(base64, "base64"));
      const pngImage = await doc.embedPng(imgBytes);
      const scaled = pngImage.scaleToFit(200, 75);
      page.drawImage(pngImage, {
        x: margin,
        y: y - scaled.height,
        width: scaled.width,
        height: scaled.height,
      });
      y -= scaled.height + 10;
    } catch {
      drawText("[Firma digitale presente]", { size: 9, color: gray });
    }
  }

  addSpace(10);
  drawLine();
  addSpace(4);

  // ===== FOOTER =====
  drawText(
    "Si allega copia del documento di riconoscimento in corso di validita.",
    { font: helveticaOblique, size: 8, align: "center", color: gray }
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
