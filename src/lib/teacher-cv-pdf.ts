import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeacherData = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  province?: string | null;
  birthDate?: Date | string | null;
  birthPlace?: string | null;
  fiscalCode?: string | null;
};

type CvData = {
  teacher: TeacherData;
  workExperiences: any[];
  educations: any[];
  languages: any[];
  certifications: any[];
  skills: any[];
  trainingCourses: any[];
  teachingExperiences: any[];
  publications: any[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARGIN = 50;
const LINE_HEIGHT = 14;
const SECTION_GAP = 20;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT_SIZE = 10;
const HEADING_SIZE = 12;
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 10;
const FOOTER_SIZE = 8;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
const COLOR_LINE = rgb(0.7, 0.7, 0.7);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
}

function fmtFullDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateRange(
  start: string | null,
  end: string | null,
  isCurrent?: boolean
): string {
  const s = fmtDate(start);
  if (!s) return "";
  if (isCurrent) return `${s} — In corso`;
  const e = fmtDate(end);
  if (e) return `${s} — ${e}`;
  return s;
}

// Simple text wrapping
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
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
  return lines.length ? lines : [""];
}

// ---------------------------------------------------------------------------
// PDF Builder
// ---------------------------------------------------------------------------

class EuropassPdfBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private y = 0;
  private pageNum = 1;
  private totalPages = 0;
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private fontItalic!: PDFFont;
  private pages: PDFPage[] = [];

  async init() {
    this.doc = await PDFDocument.create();
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.fontItalic = await this.doc.embedFont(
      StandardFonts.HelveticaOblique
    );
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.y = PAGE_HEIGHT - MARGIN;
    this.pageNum = this.pages.length;
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < MARGIN + 30) {
      this.newPage();
    }
  }

  private drawText(
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: typeof COLOR_BLACK;
      x?: number;
      indent?: number;
      maxWidth?: number;
    } = {}
  ) {
    const font = options.font ?? this.fontRegular;
    const size = options.size ?? TEXT_SIZE;
    const color = options.color ?? COLOR_BLACK;
    const x = options.x ?? MARGIN + (options.indent ?? 0);
    const maxWidth = options.maxWidth ?? CONTENT_WIDTH - (options.indent ?? 0);

    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      this.ensureSpace(LINE_HEIGHT);
      this.page.drawText(line, { x, y: this.y, size, font, color });
      this.y -= LINE_HEIGHT;
    }
  }

  private drawCentered(
    text: string,
    options: { font?: PDFFont; size?: number; color?: typeof COLOR_BLACK } = {}
  ) {
    const font = options.font ?? this.fontRegular;
    const size = options.size ?? TEXT_SIZE;
    const width = font.widthOfTextAtSize(text, size);
    const x = (PAGE_WIDTH - width) / 2;
    this.ensureSpace(LINE_HEIGHT);
    this.page.drawText(text, {
      x,
      y: this.y,
      size,
      font,
      color: options.color ?? COLOR_BLACK,
    });
    this.y -= LINE_HEIGHT;
  }

  private drawLine() {
    this.ensureSpace(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: COLOR_LINE,
    });
    this.y -= 8;
  }

  private drawSectionHeading(title: string) {
    this.y -= SECTION_GAP;
    this.ensureSpace(LINE_HEIGHT * 2 + 8);
    this.page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y: this.y,
      size: HEADING_SIZE,
      font: this.fontBold,
      color: COLOR_BLACK,
    });
    this.y -= 4;
    this.drawLine();
  }

  private drawFieldRow(label: string, value: string) {
    if (!value) return;
    this.ensureSpace(LINE_HEIGHT);

    // Draw label (bold)
    const labelWidth = 140;
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y,
      size: TEXT_SIZE,
      font: this.fontBold,
      color: COLOR_GRAY,
    });

    // Draw value (wrapped if needed)
    const valueLines = wrapText(
      value,
      this.fontRegular,
      TEXT_SIZE,
      CONTENT_WIDTH - labelWidth
    );
    for (let i = 0; i < valueLines.length; i++) {
      if (i > 0) {
        this.ensureSpace(LINE_HEIGHT);
      }
      this.page.drawText(valueLines[i], {
        x: MARGIN + labelWidth,
        y: this.y,
        size: TEXT_SIZE,
        font: this.fontRegular,
        color: COLOR_BLACK,
      });
      if (i < valueLines.length - 1) this.y -= LINE_HEIGHT;
    }
    this.y -= LINE_HEIGHT;
  }

  private drawBullet(text: string) {
    this.drawText(`\u2022 ${text}`, { indent: 10 });
  }

  // ----- Build sections -----

  buildTitle() {
    this.drawCentered("CURRICULUM VITAE", {
      font: this.fontBold,
      size: TITLE_SIZE,
    });
    this.y -= 2;
    this.drawCentered("Formato Europeo Europass", {
      font: this.fontItalic,
      size: SUBTITLE_SIZE,
      color: COLOR_GRAY,
    });
    this.y -= 10;
  }

  buildPersonalInfo(teacher: TeacherData) {
    this.drawSectionHeading("Informazioni personali");

    const fullName = `${(teacher.lastName ?? "").toUpperCase()} ${teacher.firstName ?? ""}`.trim();
    this.drawFieldRow("Nome:", fullName);

    const address = [
      teacher.address,
      [teacher.postalCode, teacher.city].filter(Boolean).join(" "),
      teacher.province ? `(${teacher.province})` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (address) this.drawFieldRow("Indirizzo:", address);

    const phone = teacher.phone || teacher.mobile;
    if (phone) this.drawFieldRow("Telefono:", phone);
    if (teacher.email) this.drawFieldRow("Email:", teacher.email);
    if (teacher.birthDate)
      this.drawFieldRow("Data di nascita:", fmtFullDate(teacher.birthDate));
    if (teacher.birthPlace)
      this.drawFieldRow("Luogo di nascita:", teacher.birthPlace);
    if (teacher.fiscalCode)
      this.drawFieldRow("Codice Fiscale:", teacher.fiscalCode);
  }

  buildWorkExperiences(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Esperienze lavorative");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 3);
      const range = dateRange(e.startDate, e.endDate, e.isCurrent);
      if (range)
        this.drawText(range, { font: this.fontBold, size: TEXT_SIZE });
      this.drawBullet(e.jobTitle);
      const employerLine = [e.employer, e.city].filter(Boolean).join(", ");
      if (employerLine) this.drawBullet(employerLine);
      if (e.sector) this.drawBullet(`Settore: ${e.sector}`);
      if (e.description) this.drawBullet(e.description);
      this.y -= 4;
    }
  }

  buildEducations(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Formazione e istruzione");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 3);
      const range = dateRange(e.startDate, e.endDate);
      if (range)
        this.drawText(range, { font: this.fontBold, size: TEXT_SIZE });
      this.drawBullet(e.title);
      const instLine = [e.institution, e.city].filter(Boolean).join(", ");
      if (instLine) this.drawBullet(instLine);
      if (e.fieldOfStudy) this.drawBullet(`Campo: ${e.fieldOfStudy}`);
      if (e.grade) this.drawBullet(`Votazione: ${e.grade}`);
      if (e.description) this.drawBullet(e.description);
      this.y -= 4;
    }
  }

  buildLanguages(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Competenze linguistiche");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 2);
      if (e.isNative) {
        this.drawText(`${e.language}: Lingua madre`, {
          font: this.fontBold,
          size: TEXT_SIZE,
        });
      } else {
        this.drawText(e.language, {
          font: this.fontBold,
          size: TEXT_SIZE,
        });
        const levels = [
          e.listening && `Comprensione: ${e.listening}`,
          e.reading && `Lettura: ${e.reading}`,
          e.speaking && `Parlato: ${e.speaking}`,
          e.writing && `Scritto: ${e.writing}`,
        ]
          .filter(Boolean)
          .join(" \u00B7 ");
        if (levels) this.drawText(levels, { indent: 10, color: COLOR_GRAY });
        if (e.certificate)
          this.drawText(`Certificazione: ${e.certificate}`, {
            indent: 10,
            color: COLOR_GRAY,
          });
      }
      this.y -= 4;
    }
  }

  buildCertifications(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Certificazioni e abilitazioni");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 2);
      this.drawBullet(e.name);
      const details = [
        e.issuingBody,
        e.issueDate ? fmtDate(e.issueDate) : null,
        e.expiryDate ? `Scadenza: ${fmtDate(e.expiryDate)}` : null,
        e.credentialId ? `Cod: ${e.credentialId}` : null,
      ]
        .filter(Boolean)
        .join(" \u00B7 ");
      if (details)
        this.drawText(details, { indent: 20, color: COLOR_GRAY });
      this.y -= 2;
    }
  }

  buildSkills(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Competenze tecniche");

    const text = entries
      .map((s: any) => {
        const parts = [s.name];
        if (s.level) parts.push(`(${s.level})`);
        return parts.join(" ");
      })
      .join(", ");
    this.drawText(text);
  }

  buildTrainingCourses(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Corsi di formazione frequentati");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 2);
      this.drawBullet(e.title);
      const details = [
        e.provider,
        e.date ? fmtDate(e.date) : null,
        e.durationHours ? `${e.durationHours}h` : null,
        e.certificate ? "Certificato" : null,
      ]
        .filter(Boolean)
        .join(" \u00B7 ");
      if (details)
        this.drawText(details, { indent: 20, color: COLOR_GRAY });
      this.y -= 2;
    }
  }

  buildTeachingExperiences(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Esperienza come docente/formatore");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 3);
      const range = dateRange(e.startDate, e.endDate);
      if (range)
        this.drawText(range, { font: this.fontBold, size: TEXT_SIZE });
      this.drawBullet(e.courseTitle);
      const details = [e.organization, e.location].filter(Boolean).join(", ");
      if (details) this.drawBullet(details);
      if (e.targetAudience)
        this.drawBullet(`Destinatari: ${e.targetAudience}`);
      if (e.totalHours) this.drawBullet(`Ore: ${e.totalHours}`);
      if (e.description) this.drawBullet(e.description);
      this.y -= 4;
    }
  }

  buildPublications(entries: any[]) {
    if (entries.length === 0) return;
    this.drawSectionHeading("Pubblicazioni");

    for (const e of entries) {
      this.ensureSpace(LINE_HEIGHT * 2);
      this.drawBullet(e.title);
      const details = [
        e.publisher,
        e.date ? fmtDate(e.date) : null,
      ]
        .filter(Boolean)
        .join(" \u00B7 ");
      if (details)
        this.drawText(details, { indent: 20, color: COLOR_GRAY });
      if (e.url) this.drawText(e.url, { indent: 20, color: COLOR_GRAY });
      this.y -= 2;
    }
  }

  buildPrivacy() {
    this.y -= SECTION_GAP;
    this.drawLine();
    this.y -= 4;
    this.drawText(
      "Autorizzo il trattamento dei miei dati personali ai sensi del D.Lgs. 196/2003 e del GDPR (UE) 2016/679.",
      { font: this.fontItalic, size: 8, color: COLOR_GRAY }
    );
    this.y -= 4;
    const today = new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    this.drawText(`Data: ${today}`, {
      font: this.fontItalic,
      size: 8,
      color: COLOR_GRAY,
    });
  }

  buildFooters() {
    this.totalPages = this.pages.length;
    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i];
      const text = `Pagina ${i + 1} di ${this.totalPages}`;
      const width = this.fontRegular.widthOfTextAtSize(text, FOOTER_SIZE);
      p.drawText(text, {
        x: (PAGE_WIDTH - width) / 2,
        y: MARGIN / 2,
        size: FOOTER_SIZE,
        font: this.fontRegular,
        color: COLOR_GRAY,
      });
    }
  }

  async generate(data: CvData): Promise<Uint8Array> {
    await this.init();

    this.buildTitle();
    this.buildPersonalInfo(data.teacher);
    this.buildWorkExperiences(data.workExperiences);
    this.buildEducations(data.educations);
    this.buildLanguages(data.languages);
    this.buildCertifications(data.certifications);
    this.buildSkills(data.skills);
    this.buildTrainingCourses(data.trainingCourses);
    this.buildTeachingExperiences(data.teachingExperiences);
    this.buildPublications(data.publications);
    this.buildPrivacy();
    this.buildFooters();

    return this.doc.save();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateEuropassCvPdf(data: CvData): Promise<Uint8Array> {
  const builder = new EuropassPdfBuilder();
  return builder.generate(data);
}
