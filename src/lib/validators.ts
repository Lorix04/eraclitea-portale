const ODD_MAP: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

const EVEN_MAP: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
};

const CHECK_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function normalizeCodiceFiscale(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidCodiceFiscale(value: string) {
  const cf = normalizeCodiceFiscale(value);
  if (!/^[A-Z0-9]{16}$/.test(cf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 15; i += 1) {
    const c = cf[i] as keyof typeof ODD_MAP;
    if ((i + 1) % 2 === 0) {
      sum += EVEN_MAP[c] ?? 0;
    } else {
      sum += ODD_MAP[c] ?? 0;
    }
  }

  const expected = CHECK_CHARS[sum % 26];
  return cf[15] === expected;
}

export const validateCF = isValidCodiceFiscale;

export function validatePIVA(piva: string): boolean {
  if (!/^\d{11}$/.test(piva)) return false;

  const digits = piva.split("").map((d) => Number(d));
  let sum = 0;

  for (let i = 0; i < 10; i += 1) {
    if (i % 2 === 0) {
      sum += digits[i];
    } else {
      const doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[10];
}
