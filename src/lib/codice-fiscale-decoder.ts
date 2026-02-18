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

export type CFDecodedData = {
  dataNascita: string;
  sesso: "M" | "F";
  codiceCatastale: string;
  comuneNascita?: string;
};

export function decodeCF(cf: string): CFDecodedData | null {
  if (!cf || cf.length !== 16) return null;
  const upperCF = cf.toUpperCase().trim();

  try {
    const yearPart = Number.parseInt(upperCF.slice(6, 8), 10);
    const monthLetter = upperCF.charAt(8);
    const month = MONTH_MAP[monthLetter];
    if (!month) return null;

    let day = Number.parseInt(upperCF.slice(9, 11), 10);
    if (!Number.isFinite(day) || day < 1) return null;

    let sesso: "M" | "F" = "M";
    if (day > 40) {
      day -= 40;
      sesso = "F";
    }
    if (day < 1 || day > 31) return null;

    const currentYear = new Date().getFullYear() % 100;
    const fullYear = yearPart > currentYear ? 1900 + yearPart : 2000 + yearPart;
    const codiceCatastale = upperCF.slice(11, 15);
    if (!/^[A-Z]\d{3}$/.test(codiceCatastale)) return null;

    const dataNascita = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${fullYear}`;
    return { dataNascita, sesso, codiceCatastale };
  } catch {
    return null;
  }
}
