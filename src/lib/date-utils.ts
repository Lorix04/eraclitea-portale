import { format, parse, isValid } from "date-fns";
import { it } from "date-fns/locale";

export const DATE_FORMAT_IT = "dd/MM/yyyy";
export const DATETIME_FORMAT_IT = "dd/MM/yyyy HH:mm";

export function parseItalianDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === "") {
    return null;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const parsed = parse(dateString, DATE_FORMAT_IT, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const parsed = new Date(dateString);
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const fallback = new Date(dateString);
  if (isValid(fallback)) {
    return fallback;
  }

  return null;
}

export function formatItalianDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!isValid(dateObj)) return "";

  return format(dateObj, DATE_FORMAT_IT, { locale: it });
}

export function formatItalianDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!isValid(dateObj)) return "";

  return format(dateObj, DATETIME_FORMAT_IT, { locale: it });
}

export function isValidItalianDate(dateString: string): boolean {
  if (!dateString || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    return false;
  }

  const parsed = parseItalianDate(dateString);
  return parsed !== null;
}

export function dateToItalianString(date: Date | null | undefined): string {
  if (!date) return "";
  return formatItalianDate(date);
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!isValid(dateObj)) return "";

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;

  return formatItalianDate(dateObj);
}
