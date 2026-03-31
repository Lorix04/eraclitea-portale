/**
 * Standard Employee fields that can be mapped in client custom field configuration.
 * key = Employee DB column name, label = default Italian label
 */
export const STANDARD_EMPLOYEE_FIELDS: {
  key: string;
  label: string;
  type: string;
}[] = [
  { key: "codiceFiscale", label: "Codice Fiscale", type: "text" },
  { key: "nome", label: "Nome", type: "text" },
  { key: "cognome", label: "Cognome", type: "text" },
  { key: "sesso", label: "Sesso", type: "select" },
  { key: "dataNascita", label: "Data di Nascita", type: "date" },
  { key: "luogoNascita", label: "Luogo di Nascita", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "comuneResidenza", label: "Comune Residenza", type: "text" },
  { key: "cap", label: "CAP", type: "text" },
  { key: "provincia", label: "Provincia", type: "text" },
  { key: "regione", label: "Regione", type: "text" },
  { key: "indirizzo", label: "Indirizzo", type: "text" },
  { key: "telefono", label: "Telefono", type: "text" },
  { key: "cellulare", label: "Cellulare", type: "text" },
  { key: "mansione", label: "Mansione", type: "text" },
  { key: "emailAziendale", label: "Email Aziendale", type: "email" },
  { key: "pec", label: "PEC", type: "email" },
  { key: "partitaIva", label: "Partita IVA", type: "text" },
  { key: "iban", label: "IBAN", type: "text" },
  { key: "note", label: "Note", type: "text" },
];

export const STANDARD_FIELD_MAP = new Map(
  STANDARD_EMPLOYEE_FIELDS.map((f) => [f.key, f])
);
