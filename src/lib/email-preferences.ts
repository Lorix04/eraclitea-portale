export type EmailPreferenceCategory = "CLIENT" | "ADMIN";

export type EmailPreferenceSeed = {
  emailType: string;
  label: string;
  description: string;
  isEnabled: boolean;
  category: EmailPreferenceCategory;
};

export const EMAIL_PREFERENCE_DEFAULTS: EmailPreferenceSeed[] = [
  {
    emailType: "WELCOME",
    label: "Benvenuto nuovo cliente",
    description:
      "Email con credenziali di accesso quando si crea un nuovo account cliente.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "NEW_EDITION",
    label: "Nuova edizione disponibile",
    description:
      "Notifica quando un'edizione passa da Bozza ad Aperto per un cliente.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "REMINDER_DEADLINE_7D",
    label: "Reminder deadline anagrafiche (7 giorni)",
    description:
      "Promemoria 7 giorni prima della scadenza per l'inserimento anagrafiche.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "REMINDER_DEADLINE_2D",
    label: "Reminder deadline anagrafiche (2 giorni)",
    description:
      "Promemoria 2 giorni prima della scadenza per l'inserimento anagrafiche.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "CERTIFICATES_AVAILABLE",
    label: "Attestati disponibili",
    description:
      "Notifica quando l'admin carica attestati per un'edizione del cliente.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "CERTIFICATE_EXPIRING_60D",
    label: "Attestato in scadenza (60 giorni)",
    description: "Avviso 60 giorni prima della scadenza di un attestato.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "CERTIFICATE_EXPIRING_30D",
    label: "Attestato in scadenza (30 giorni)",
    description: "Avviso 30 giorni prima della scadenza di un attestato.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "REGISTRY_ISSUE",
    label: "Problema anagrafiche",
    description:
      "Notifica quando l'admin richiede correzioni alle anagrafiche inviate.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "REGISTRY_RECEIVED",
    label: "Conferma ricezione anagrafiche",
    description:
      "Conferma al cliente che le anagrafiche sono state ricevute correttamente.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "EDITION_DATES_CHANGED",
    label: "Modifica date edizione",
    description:
      "Notifica quando l'admin modifica le date di un'edizione aperta.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "EDITION_CANCELLED",
    label: "Edizione cancellata",
    description:
      "Notifica quando un'edizione aperta viene chiusa o eliminata.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "ADMIN_REGISTRY_SUBMITTED",
    label: "Anagrafiche inviate dal cliente",
    description:
      "Notifica all'admin quando un cliente invia le anagrafiche per un'edizione.",
    isEnabled: true,
    category: "ADMIN",
  },
  {
    emailType: "ADMIN_DEADLINE_EXPIRED",
    label: "Deadline scaduta senza anagrafiche",
    description:
      "Notifica all'admin quando la deadline anagrafiche e passata e il cliente non ha completato.",
    isEnabled: true,
    category: "ADMIN",
  },
];

export const EMAIL_TYPE_LABEL_MAP: Record<string, string> =
  EMAIL_PREFERENCE_DEFAULTS.reduce<Record<string, string>>((acc, pref) => {
    acc[pref.emailType] = pref.label;
    return acc;
  }, {});
