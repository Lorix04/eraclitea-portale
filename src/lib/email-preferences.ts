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
  {
    emailType: "REGISTRY_CONFIRMED",
    label: "Conferma invio anagrafiche",
    description:
      "Email di conferma a tutti gli utenti del client quando le anagrafiche vengono inviate.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "DEADLINE_EXPIRED",
    label: "Deadline scaduta (al client)",
    description:
      "Notifica al client quando la deadline per le anagrafiche e scaduta.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "COURSE_COMPLETED",
    label: "Corso completato",
    description:
      "Notifica quando un'edizione viene completata o chiusa.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "TICKET_CLOSED",
    label: "Ticket chiuso",
    description:
      "Email dedicata quando un ticket di supporto viene chiuso.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "WEEKLY_SUMMARY",
    label: "Riepilogo settimanale",
    description:
      "Riepilogo settimanale con corsi attivi, deadline, attestati e ticket.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "EDITION_INFO_CHANGED",
    label: "Edizione aggiornata (info)",
    description:
      "Notifica quando vengono modificate le informazioni di un'edizione attiva.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "DEADLINE_TODAY",
    label: "Deadline oggi",
    description:
      "Avviso urgente il giorno stesso della scadenza anagrafiche.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "COURSE_STARTING_TOMORROW",
    label: "Corso in partenza domani",
    description:
      "Promemoria il giorno prima dell'inizio del corso.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "REGISTRY_REJECTED",
    label: "Anagrafiche rifiutate",
    description:
      "Notifica quando l'admin richiede modifiche alle anagrafiche inviate.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "CERTIFICATE_EXPIRED",
    label: "Attestato scaduto",
    description:
      "Notifica il giorno di scadenza di un attestato.",
    isEnabled: true,
    category: "CLIENT",
  },
  {
    emailType: "TICKET_REOPENED",
    label: "Ticket riaperto",
    description:
      "Notifica quando un ticket chiuso viene riaperto.",
    isEnabled: true,
    category: "CLIENT",
  },
];

export const EMAIL_TYPE_LABEL_MAP: Record<string, string> =
  EMAIL_PREFERENCE_DEFAULTS.reduce<Record<string, string>>((acc, pref) => {
    acc[pref.emailType] = pref.label;
    return acc;
  }, {});
