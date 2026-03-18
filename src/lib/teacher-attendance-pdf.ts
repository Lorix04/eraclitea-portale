import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatItalianDate } from "@/lib/date-utils";

function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "PRESENT":
      return "P";
    case "ABSENT":
      return "A";
    case "ABSENT_JUSTIFIED":
      return "G";
    default:
      return "\u2014";
  }
}

export async function generateAttendanceRegisterPdf(data: {
  lesson: {
    date: string;
    startTime: string | null;
    endTime: string | null;
    durationHours: number;
    title: string | null;
    location: string | null;
  };
  course: { name: string; editionNumber: number; clientName: string };
  teacher: { firstName: string; lastName: string };
  participants: Array<{
    index: number;
    lastName: string;
    firstName: string;
    fiscalCode: string;
    status: string | null;
    hoursAttended: number | null;
    notes: string | null;
  }>;
  stats: {
    present: number;
    absent: number;
    absentJustified: number;
    total: number;
  };
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle("Registro Presenze");
  doc.setAuthor("Portale Sapienta");
  doc.setCreator("Portale Sapienta");

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.92, 0.92, 0.92);

  // Helper: draw centered text
  function drawCentered(
    text: string,
    font: typeof helvetica,
    size: number,
    color = black
  ) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: margin + (contentWidth - w) / 2,
      y,
      size,
      font,
      color,
    });
    y -= size * 1.6;
  }

  // Helper: draw left-aligned text
  function drawLeft(
    text: string,
    font: typeof helvetica,
    size: number,
    color = black,
    x = margin
  ) {
    const lines = wrapText(text, font, size, contentWidth - (x - margin));
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color });
      y -= size * 1.5;
    }
  }

  // ===== TITLE =====
  drawCentered("REGISTRO PRESENZE", helveticaBold, 14);
  y -= 8;

  // ===== LESSON INFO =====
  const formattedDate = formatItalianDate(data.lesson.date);
  const timeRange =
    data.lesson.startTime && data.lesson.endTime
      ? `${data.lesson.startTime} - ${data.lesson.endTime}`
      : "";
  const durationStr = `${data.lesson.durationHours}h`;

  drawLeft(
    `Corso: ${data.course.name} \u00B7 Ed. #${data.course.editionNumber}`,
    helvetica,
    10
  );
  drawLeft(`Cliente: ${data.course.clientName}`, helvetica, 10);
  drawLeft(
    `Data: ${formattedDate}${timeRange ? ` \u00B7 ${timeRange}` : ""} (${durationStr})`,
    helvetica,
    10
  );
  drawLeft(
    `Luogo: ${data.lesson.location || "N/D"}`,
    helvetica,
    10
  );
  drawLeft(
    `Docente: ${data.teacher.lastName} ${data.teacher.firstName}`,
    helvetica,
    10
  );
  y -= 12;

  // ===== TABLE =====
  // Column definitions: #, Cognome Nome, Codice Fiscale, Stato, Ore, Note
  const colWidths = [25, 160, 110, 40, 35, contentWidth - 25 - 160 - 110 - 40 - 35];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }
  const headers = ["#", "Cognome Nome", "Codice Fiscale", "Stato", "Ore", "Note"];
  const rowHeight = 18;
  const fontSize = 8;
  const headerFontSize = 8;

  // Draw header background
  page.drawRectangle({
    x: margin,
    y: y - rowHeight + 4,
    width: contentWidth,
    height: rowHeight,
    color: lightGray,
  });

  // Draw header text
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: colX[i] + 3,
      y: y - rowHeight + 8,
      size: headerFontSize,
      font: helveticaBold,
      color: black,
    });
  }
  y -= rowHeight;

  // Draw header bottom line
  page.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: margin + contentWidth, y: y + 4 },
    thickness: 0.8,
    color: gray,
  });

  // Draw rows
  for (const p of data.participants) {
    // Check if we need a new page
    if (y - rowHeight < margin + 80) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const rowData = [
      String(p.index),
      `${p.lastName} ${p.firstName}`,
      p.fiscalCode.length > 16 ? p.fiscalCode.substring(0, 16) : p.fiscalCode,
      statusLabel(p.status),
      p.hoursAttended != null ? String(p.hoursAttended) : "\u2014",
      p.notes || "",
    ];

    for (let i = 0; i < rowData.length; i++) {
      const maxColWidth = colWidths[i] - 6;
      let text = rowData[i];
      // Truncate if text is too wide
      if (helvetica.widthOfTextAtSize(text, fontSize) > maxColWidth) {
        while (
          text.length > 1 &&
          helvetica.widthOfTextAtSize(text + "\u2026", fontSize) > maxColWidth
        ) {
          text = text.slice(0, -1);
        }
        text = text + "\u2026";
      }
      page.drawText(text, {
        x: colX[i] + 3,
        y: y - rowHeight + 8,
        size: fontSize,
        font: helvetica,
        color: black,
      });
    }

    y -= rowHeight;

    // Row separator line
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: margin + contentWidth, y: y + 4 },
      thickness: 0.3,
      color: lightGray,
    });
  }

  y -= 16;

  // Check remaining space for footer content
  if (y < margin + 100) {
    page = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  // ===== LEGEND =====
  drawLeft(
    "P = Presente \u00B7 A = Assente \u00B7 G = Giustificato \u00B7 \u2014 = Non registrato",
    helvetica,
    8,
    gray
  );
  y -= 6;

  // ===== SUMMARY =====
  drawLeft(
    `Presenti: ${data.stats.present}/${data.stats.total} \u00B7 Ore erogate: ${data.lesson.durationHours}h`,
    helveticaBold,
    9
  );
  y -= 16;

  // ===== SIGNATURE LINE =====
  drawLeft("Firma docente: _______________________", helvetica, 10);
  y -= 20;

  // ===== FOOTER =====
  const todayFormatted = formatItalianDate(new Date());
  drawLeft(`Data stampa: ${todayFormatted}`, helvetica, 8, gray);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
