/**
 * Auto-matching nome-file ↔ dipendente per l'upload attestati (client-side).
 *
 * Match basato SOLO su token (order-independent): nessun parsing fragile cognome-vs-nome.
 * Un dipendente abbina se TUTTI i suoi token (nome + cognome) sono contenuti nei token del
 * nome file. Match restituito SOLO se unico: 0 candidati → nessun match; >1 (ambiguo) →
 * nessun match (mai "best guess").
 */

export type MatchableEmployee = {
  id: string;
  nome?: string | null;
  cognome?: string | null;
};

/**
 * Normalizza un testo: rimuove accenti (NFD + strip combining marks), UPPERCASE,
 * trasforma apostrofi/punteggiatura in spazi, collassa gli spazi.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritici (accenti)
    .toUpperCase()
    .replace(/['’`´]/g, " ") // apostrofi → spazio
    .replace(/[^A-Z0-9\s]/g, " ") // altra punteggiatura/underscore → spazio
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

/**
 * Token dal nome file: rimuove l'estensione, scarta il token "ATTESTATO" e i progressivi
 * tipo "N5494" (/^N\d+$/). Lo split su `_`, spazi e punteggiatura è gestito da normalizeText.
 */
export function filenameTokens(filename: string): string[] {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return tokenize(withoutExt).filter(
    (token) => token !== "ATTESTATO" && !/^N\d+$/.test(token)
  );
}

/** Token del dipendente da nome + cognome normalizzati. */
export function employeeTokens(employee: MatchableEmployee): string[] {
  return tokenize(`${employee.cognome ?? ""} ${employee.nome ?? ""}`);
}

export type MatchStatus = "matched" | "none" | "ambiguous";

export type MatchResult = {
  employeeId: string | null;
  status: MatchStatus;
  /** Id dei dipendenti compatibili quando lo stato è "ambiguous". */
  candidateIds?: string[];
};

/**
 * Esito completo dell'abbinamento token-based:
 * - 1 dipendente con tutti i token ⊆ token file → { matched, employeeId }
 * - 0 corrispondenti → { none, employeeId: null }
 * - >1 corrispondenti (ambiguo) → { ambiguous, employeeId: null, candidateIds }
 * La logica di abbinamento è invariata: cambia solo il valore di ritorno (stato + motivo).
 */
export function matchEmployeeResult(
  filename: string,
  employees: MatchableEmployee[]
): MatchResult {
  const fileTokenSet = new Set(filenameTokens(filename));
  if (fileTokenSet.size === 0) {
    return { employeeId: null, status: "none" };
  }

  const matches = employees.filter((employee) => {
    const tokens = employeeTokens(employee);
    if (tokens.length === 0) return false;
    return tokens.every((token) => fileTokenSet.has(token));
  });

  if (matches.length === 1) {
    return { employeeId: matches[0].id, status: "matched" };
  }
  if (matches.length === 0) {
    return { employeeId: null, status: "none" };
  }
  return {
    employeeId: null,
    status: "ambiguous",
    candidateIds: matches.map((match) => match.id),
  };
}

/**
 * Ritorna l'id del dipendente se e solo se ESATTAMENTE UNO ha tutti i suoi token contenuti
 * nei token del nome file. 0 match o >1 (ambiguo) → null. Delega a {@link matchEmployeeResult}.
 */
export function matchEmployeeByFilename(
  filename: string,
  employees: MatchableEmployee[]
): string | null {
  return matchEmployeeResult(filename, employees).employeeId;
}
