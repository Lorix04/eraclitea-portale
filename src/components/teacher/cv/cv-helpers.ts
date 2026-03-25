// Date formatting helpers for CV sections

const MONTHS_IT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  isCurrent?: boolean
): string {
  const start = formatMonthYear(startDate);
  if (!start) return "";
  if (isCurrent) return `${start} — In corso`;
  const end = formatMonthYear(endDate);
  if (!end) return start;

  const s = new Date(startDate!);
  const e = new Date(endDate!);
  const totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  let duration = "";
  if (years > 0) {
    duration = `${years} ann${years > 1 ? "i" : "o"}`;
    if (months > 0) duration += ` ${months} mes${months > 1 ? "i" : "e"}`;
  } else if (months > 0) {
    duration = `${months} mes${months > 1 ? "i" : "e"}`;
  }

  return duration ? `${start} — ${end} (${duration})` : `${start} — ${end}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

export function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function isExpiringSoon(dateStr: string | null | undefined, withinMonths = 3): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (d < now) return false;
  const limit = new Date();
  limit.setMonth(limit.getMonth() + withinMonths);
  return d <= limit;
}

// Date input helpers — convert to/from YYYY-MM format for month pickers
export function toMonthInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fromMonthInput(val: string): string | null {
  if (!val) return null;
  // "YYYY-MM" → ISO date string (first of month)
  return `${val}-01T00:00:00.000Z`;
}

export function toDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function fromDateInput(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

// Sector options for work experience
export const SECTORS = [
  "Formazione",
  "Sicurezza sul lavoro",
  "Consulenza",
  "Sanità",
  "Industria",
  "Edilizia",
  "Pubblica Amministrazione",
  "IT",
  "Altro",
];

// Skill categories
export const SKILL_CATEGORIES = [
  "Digitale",
  "Tecnica",
  "Software",
  "Gestionale",
  "Linguistica",
  "Altro",
];

// Skill levels
export const SKILL_LEVELS = ["Base", "Intermedio", "Avanzato", "Esperto"];

// Language levels (CEFR)
export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
