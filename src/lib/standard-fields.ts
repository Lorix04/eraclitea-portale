/**
 * Standard Employee fields that can be mapped in client custom field configuration.
 * key = Employee DB column name, label = default Italian label
 * aliases = lowercase alternative names for header matching
 */
export type StandardFieldDef = {
  key: string;
  label: string;
  type: string;
  aliases: string[];
};

export const STANDARD_EMPLOYEE_FIELDS: StandardFieldDef[] = [
  { key: "codiceFiscale", label: "Codice Fiscale", type: "text",
    aliases: ["codice fiscale", "codicefiscale", "codice_fiscale", "cf", "cod fiscale", "cod. fiscale", "fiscal code"] },
  { key: "nome", label: "Nome", type: "text",
    aliases: ["nome", "first name", "firstname", "name"] },
  { key: "cognome", label: "Cognome", type: "text",
    aliases: ["cognome", "surname", "last name", "lastname", "family name"] },
  { key: "sesso", label: "Sesso", type: "select",
    aliases: ["sesso", "genere", "gender", "sex", "m/f"] },
  { key: "dataNascita", label: "Data di Nascita", type: "date",
    aliases: ["data di nascita", "data nascita", "data_nascita", "datanascita", "date of birth", "birth date", "nato il"] },
  { key: "luogoNascita", label: "Luogo di Nascita", type: "text",
    aliases: ["luogo di nascita", "luogo nascita", "luogonascita", "comune di nascita", "comune nascita", "comune_nascita", "place of birth", "nato a"] },
  { key: "email", label: "Email", type: "email",
    aliases: ["email", "e-mail", "mail", "indirizzo email", "indirizzo e-mail", "indirizzo mail", "indirizzo di posta", "posta elettronica", "indirizzo posta elettronica"] },
  { key: "comuneResidenza", label: "Comune Residenza", type: "text",
    aliases: ["comune residenza", "comune di residenza", "comune_residenza", "comuneresidenza", "citta residenza", "citta di residenza"] },
  { key: "cap", label: "CAP", type: "text",
    aliases: ["cap", "codice postale", "zip", "zip code", "postal code"] },
  { key: "provincia", label: "Provincia", type: "text",
    aliases: ["provincia", "prov", "prov.", "province"] },
  { key: "regione", label: "Regione", type: "text",
    aliases: ["regione", "region"] },
  { key: "indirizzo", label: "Indirizzo", type: "text",
    aliases: ["indirizzo", "via", "address", "street", "domicilio", "indirizzo residenza", "indirizzo di residenza"] },
  { key: "telefono", label: "Telefono", type: "text",
    aliases: ["telefono", "tel", "tel.", "phone", "fisso", "telefono fisso"] },
  { key: "cellulare", label: "Cellulare", type: "text",
    aliases: ["cellulare", "cell", "cell.", "mobile", "tel cellulare", "numero cellulare"] },
  { key: "mansione", label: "Mansione", type: "text",
    aliases: ["mansione", "ruolo", "posizione", "qualifica", "job title"] },
  { key: "emailAziendale", label: "Email Aziendale", type: "email",
    aliases: ["email aziendale", "e-mail aziendale", "mail aziendale", "email_aziendale", "emailaziendale", "posta aziendale"] },
  { key: "pec", label: "PEC", type: "email",
    aliases: ["pec", "posta certificata", "posta elettronica certificata"] },
  { key: "partitaIva", label: "Partita IVA", type: "text",
    aliases: ["partita iva", "partitaiva", "partita_iva", "p.iva", "p. iva", "p iva", "vat"] },
  { key: "iban", label: "IBAN", type: "text",
    aliases: ["iban", "codice iban"] },
  { key: "note", label: "Note", type: "text",
    aliases: ["note", "notes", "annotazioni", "osservazioni"] },
];

export const STANDARD_FIELD_MAP = new Map(
  STANDARD_EMPLOYEE_FIELDS.map((f) => [f.key, f])
);

/**
 * Match a column header to a standard Employee field.
 * 1. Exact match on key, label, or alias (fastest, most reliable)
 * 2. Partial match choosing the longest matching alias (most specific wins)
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[_\-\.]+/g, " ").replace(/\s+/g, " ");
}

export function detectStandardField(columnName: string): StandardFieldDef | null {
  const normalized = normalize(columnName);
  if (!normalized) return null;

  // Step 1: Exact match (key, label, or alias — all normalized the same way)
  for (const field of STANDARD_EMPLOYEE_FIELDS) {
    if (normalized === normalize(field.key)) return field;
    if (normalized === normalize(field.label)) return field;
    if (field.aliases.some((alias) => normalized === normalize(alias))) return field;
  }

  // Step 2: Partial match — pick the longest matching alias (most specific wins)
  let bestMatch: { field: StandardFieldDef; matchLength: number } | null = null;

  for (const field of STANDARD_EMPLOYEE_FIELDS) {
    for (const alias of field.aliases) {
      const normAlias = normalize(alias);
      if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
        if (!bestMatch || normAlias.length > bestMatch.matchLength) {
          bestMatch = { field, matchLength: normAlias.length };
        }
      }
    }
  }

  return bestMatch?.field ?? null;
}
