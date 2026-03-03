import { existsSync, readFileSync } from "fs";
import path from "path";
import { parseItalianDate } from "@/lib/date-utils";
import { isValidCodiceFiscale, normalizeCodiceFiscale } from "@/lib/validators";

const MONTH_MAP: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  H: 6,
  L: 7,
  M: 8,
  P: 9,
  R: 10,
  S: 11,
  T: 12,
};

type CatastaliMap = Record<string, { nome: string; provincia: string; cap: string }>;

let cachedCatastaliMap: CatastaliMap | null = null;
let cachedComuneToCode: Map<string, string> | null = null;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getConsonants(value: string) {
  return normalizeText(value).replace(/[^A-Z]/g, "").replace(/[AEIOU]/g, "");
}

function getVowels(value: string) {
  return normalizeText(value).replace(/[^A-Z]/g, "").replace(/[^AEIOU]/g, "");
}

function getSurnameCode(surname: string) {
  const consonants = getConsonants(surname);
  const vowels = getVowels(surname);
  return `${consonants}${vowels}XXX`.slice(0, 3);
}

function getNameCode(name: string) {
  const consonants = getConsonants(name);
  if (consonants.length >= 4) {
    return `${consonants[0]}${consonants[2]}${consonants[3]}`;
  }
  const vowels = getVowels(name);
  return `${consonants}${vowels}XXX`.slice(0, 3);
}

function loadCatastaliData() {
  if (cachedCatastaliMap && cachedComuneToCode) {
    return { byCode: cachedCatastaliMap, comuneToCode: cachedComuneToCode };
  }

  const filePath = path.join(process.cwd(), "public", "data", "codici-catastali.json");
  if (!existsSync(filePath)) {
    return { byCode: null, comuneToCode: null };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as CatastaliMap;
    const comuneToCode = new Map<string, string>();
    for (const [code, value] of Object.entries(parsed)) {
      const normalizedName = normalizeText(value.nome || "");
      if (normalizedName) {
        comuneToCode.set(normalizedName, code.toUpperCase());
      }
    }
    cachedCatastaliMap = parsed;
    cachedComuneToCode = comuneToCode;
    return { byCode: cachedCatastaliMap, comuneToCode: cachedComuneToCode };
  } catch {
    return { byCode: null, comuneToCode: null };
  }
}

function parseBirthDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsedItalian = parseItalianDate(value);
  if (parsedItalian) return parsedItalian;
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function resolveBirthPlaceCode(input: string) {
  const value = input.trim().toUpperCase();
  if (/^[A-Z][0-9]{3}$/.test(value)) {
    return value;
  }

  const { comuneToCode } = loadCatastaliData();
  if (!comuneToCode) return null;
  return comuneToCode.get(normalizeText(input)) ?? null;
}

export function decodeFiscalCode(cf: string): {
  valid: boolean;
  gender: "M" | "F" | null;
  birthDate: Date | null;
  birthPlace: string | null;
  surname: string | null;
  name: string | null;
} {
  const normalized = normalizeCodiceFiscale(cf || "");
  if (!isValidCodiceFiscale(normalized) || normalized.length !== 16) {
    return {
      valid: false,
      gender: null,
      birthDate: null,
      birthPlace: null,
      surname: null,
      name: null,
    };
  }

  const yearPart = Number.parseInt(normalized.slice(6, 8), 10);
  const monthLetter = normalized[8];
  const month = MONTH_MAP[monthLetter];
  let dayRaw = Number.parseInt(normalized.slice(9, 11), 10);
  if (!month || Number.isNaN(dayRaw)) {
    return {
      valid: false,
      gender: null,
      birthDate: null,
      birthPlace: null,
      surname: normalized.slice(0, 3),
      name: normalized.slice(3, 6),
    };
  }

  let gender: "M" | "F" = "M";
  if (dayRaw > 40) {
    dayRaw -= 40;
    gender = "F";
  }
  if (dayRaw < 1 || dayRaw > 31) {
    return {
      valid: false,
      gender: null,
      birthDate: null,
      birthPlace: normalized.slice(11, 15),
      surname: normalized.slice(0, 3),
      name: normalized.slice(3, 6),
    };
  }

  const currentYY = new Date().getFullYear() % 100;
  const year = yearPart > currentYY ? 1900 + yearPart : 2000 + yearPart;
  const birthDate = new Date(Date.UTC(year, month - 1, dayRaw));
  const birthPlace = normalized.slice(11, 15);

  return {
    valid: true,
    gender,
    birthDate,
    birthPlace,
    surname: normalized.slice(0, 3),
    name: normalized.slice(3, 6),
  };
}

export function validateFiscalCodeAgainstData(
  cf: string,
  employeeData: {
    firstName: string;
    lastName: string;
    birthDate?: string | Date | null;
    gender?: string | null;
    birthPlace?: string | null;
  }
): {
  isValid: boolean;
  mismatches: string[];
  warnings: string[];
} {
  const decoded = decodeFiscalCode(cf);
  const mismatches: string[] = [];
  const warnings: string[] = [];

  if (!decoded.valid) {
    return {
      isValid: false,
      mismatches,
      warnings,
    };
  }

  if (!employeeData.lastName?.trim()) {
    warnings.push("Campo cognome non compilato, impossibile verificare");
  } else {
    const expectedSurnameCode = getSurnameCode(employeeData.lastName);
    if (decoded.surname !== expectedSurnameCode) {
      mismatches.push("Il cognome non corrisponde al codice fiscale");
    }
  }

  if (!employeeData.firstName?.trim()) {
    warnings.push("Campo nome non compilato, impossibile verificare");
  } else {
    const expectedNameCode = getNameCode(employeeData.firstName);
    if (decoded.name !== expectedNameCode) {
      mismatches.push("Il nome non corrisponde al codice fiscale");
    }
  }

  const parsedBirthDate = parseBirthDate(employeeData.birthDate);
  if (!parsedBirthDate) {
    warnings.push("Campo data di nascita non compilato, impossibile verificare");
  } else if (!decoded.birthDate || !sameDate(decoded.birthDate, parsedBirthDate)) {
    mismatches.push("La data di nascita non corrisponde al codice fiscale");
  }

  const gender = employeeData.gender?.trim().toUpperCase();
  if (!gender) {
    warnings.push("Campo genere non compilato, impossibile verificare");
  } else if (gender !== decoded.gender) {
    mismatches.push("Il genere non corrisponde al codice fiscale");
  }

  const birthPlaceInput = employeeData.birthPlace?.trim();
  if (!birthPlaceInput) {
    warnings.push("Campo luogo di nascita non compilato, impossibile verificare");
  } else {
    const expectedBirthPlaceCode = resolveBirthPlaceCode(birthPlaceInput);
    if (!expectedBirthPlaceCode) {
      warnings.push(
        "Impossibile verificare il luogo di nascita: codice catastale non disponibile"
      );
    } else if (decoded.birthPlace !== expectedBirthPlaceCode) {
      warnings.push("Il luogo di nascita non corrisponde al codice fiscale");
    }
  }

  return {
    isValid: true,
    mismatches,
    warnings,
  };
}
