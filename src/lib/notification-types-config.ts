export interface NotificationTypeConfig {
  type: string;
  label: string;
  description: string;
  category: string;
  roles: ("ADMIN" | "CLIENT" | "TEACHER")[];
  hasInApp: boolean;
  hasEmail: boolean;
  locked: boolean;
  defaultInApp: boolean;
  defaultEmail: boolean;
}

export const NOTIFICATION_CATEGORIES = [
  { id: "corsi", label: "Corsi e Formazione" },
  { id: "anagrafiche", label: "Anagrafiche" },
  { id: "attestati", label: "Attestati" },
  { id: "presenze", label: "Presenze" },
  { id: "materiali", label: "Materiali" },
  { id: "ticket", label: "Ticket e Supporto" },
  { id: "amministratori", label: "Amministratori" },
  { id: "account", label: "Account e Sicurezza" },
  { id: "riepilogo", label: "Riepilogo" },
  { id: "docente", label: "Formazione Docente" },
];

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  // === CORSI (CLIENT) ===
  { type: "NEW_EDITION", label: "Nuova edizione disponibile", description: "Quando viene pubblicata una nuova edizione per la tua azienda", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "EDITION_DATES_CHANGED", label: "Date edizione modificate", description: "Quando cambiano le date di un'edizione pubblicata", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "EDITION_INFO_CHANGED", label: "Edizione aggiornata", description: "Quando cambiano le informazioni di un'edizione", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "EDITION_CANCELLED", label: "Edizione annullata", description: "Quando un'edizione viene cancellata o archiviata", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "COURSE_COMPLETED", label: "Corso completato", description: "Quando un corso viene completato", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "COURSE_STARTING_TOMORROW", label: "Corso in partenza domani", description: "Promemoria il giorno prima dell'inizio", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "LESSON_CHANGED", label: "Lezione modificata", description: "Quando una lezione viene aggiunta, modificata o cancellata", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "TEACHER_CHANGED", label: "Docente cambiato", description: "Quando viene cambiato il docente di un'edizione", category: "corsi", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },

  // === ANAGRAFICHE (CLIENT) ===
  { type: "DEADLINE_REMINDER_7D", label: "Deadline anagrafiche (7 giorni)", description: "Promemoria 7 giorni prima della scadenza", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "DEADLINE_REMINDER_2D", label: "Deadline anagrafiche (2 giorni)", description: "Promemoria 2 giorni prima della scadenza", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "DEADLINE_TODAY", label: "Deadline anagrafiche (oggi)", description: "Avviso il giorno stesso della scadenza", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "DEADLINE_EXPIRED", label: "Deadline scaduta", description: "Avviso quando la deadline e passata", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "REGISTRY_CONFIRMED", label: "Anagrafiche confermate", description: "Conferma ricezione delle anagrafiche inviate", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "REGISTRY_REJECTED", label: "Anagrafiche da rivedere", description: "Quando l'ente richiede modifiche alle anagrafiche", category: "anagrafiche", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ATTESTATI (CLIENT) ===
  { type: "CERTIFICATES_AVAILABLE", label: "Attestati disponibili", description: "Quando nuovi attestati sono pronti per il download", category: "attestati", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "CERTIFICATE_EXPIRING_60D", label: "Attestato in scadenza (60gg)", description: "Promemoria 60 giorni prima della scadenza", category: "attestati", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "CERTIFICATE_EXPIRING_30D", label: "Attestato in scadenza (30gg)", description: "Promemoria 30 giorni prima della scadenza", category: "attestati", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "CERTIFICATE_EXPIRED", label: "Attestato scaduto", description: "Avviso il giorno di scadenza", category: "attestati", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === PRESENZE (CLIENT) ===
  { type: "ATTENDANCE_RECORDED", label: "Presenze registrate", description: "Quando le presenze vengono registrate", category: "presenze", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },

  // === MATERIALI (CLIENT) ===
  { type: "MATERIAL_UPLOADED", label: "Nuovo materiale", description: "Quando vengono caricati nuovi materiali per un corso", category: "materiali", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },

  // === TICKET (CLIENT) ===
  { type: "TICKET_REPLY", label: "Risposta al ticket", description: "Quando il supporto risponde al tuo ticket", category: "ticket", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "TICKET_STATUS_CHANGED", label: "Stato ticket aggiornato", description: "Quando cambia lo stato del tuo ticket", category: "ticket", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "TICKET_CLOSED", label: "Ticket chiuso", description: "Quando il tuo ticket viene chiuso", category: "ticket", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "TICKET_REOPENED", label: "Ticket riaperto", description: "Quando un ticket chiuso viene riaperto", category: "ticket", roles: ["CLIENT"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: false },

  // === AMMINISTRATORI (CLIENT) ===
  { type: "INVITE_ACCEPTED", label: "Invito accettato", description: "Quando un amministratore invitato accetta l'invito", category: "amministratori", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "INVITE_EXPIRED_NOTIFY", label: "Invito scaduto", description: "Quando un invito scade senza essere accettato", category: "amministratori", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "ADMIN_LIMIT_ALMOST_REACHED", label: "Limite amministratori", description: "Quando rimane solo 1 posto disponibile", category: "amministratori", roles: ["CLIENT"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },

  // === ACCOUNT (ALL ROLES — LOCKED) ===
  { type: "PASSWORD_CHANGED", label: "Password modificata", description: "Conferma quando la password viene cambiata", category: "account", roles: ["CLIENT", "ADMIN", "TEACHER"], hasInApp: false, hasEmail: true, locked: true, defaultInApp: false, defaultEmail: true },
  { type: "ACCOUNT_UNLOCKED", label: "Account sbloccato", description: "Quando l'account viene sbloccato dopo un lockout", category: "account", roles: ["CLIENT", "ADMIN", "TEACHER"], hasInApp: true, hasEmail: false, locked: true, defaultInApp: true, defaultEmail: false },

  // === RIEPILOGO (CLIENT) ===
  { type: "WEEKLY_SUMMARY", label: "Riepilogo settimanale", description: "Email con riepilogo di corsi, deadline e attestati", category: "riepilogo", roles: ["CLIENT"], hasInApp: false, hasEmail: true, locked: false, defaultInApp: false, defaultEmail: true },

  // === ADMIN NOTIFICATIONS ===
  { type: "REGISTRY_RECEIVED", label: "Anagrafiche ricevute", description: "Quando un client invia le anagrafiche", category: "anagrafiche", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "TICKET_OPENED", label: "Nuovo ticket", description: "Quando un client apre un nuovo ticket", category: "ticket", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "TICKET_NEW_MESSAGE", label: "Nuovo messaggio ticket", description: "Quando un client scrive in un ticket", category: "ticket", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === DOCENTE NOTIFICATIONS ===
  { type: "LESSON_ASSIGNED", label: "Lezione assegnata", description: "Quando ti viene assegnata una nuova lezione", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "LESSON_UPDATED", label: "Lezione modificata", description: "Quando cambiano i dettagli di una lezione assegnata", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "LESSON_CANCELLED", label: "Lezione cancellata", description: "Quando una lezione assegnata viene cancellata", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "TEACHER_MESSAGE_RECEIVED", label: "Messaggio dall'amministrazione", description: "Quando ricevi un messaggio dall'admin", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "CV_DPR445_REQUEST", label: "Richiesta CV DPR 445", description: "Quando viene richiesta la compilazione del CV", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "CV_DPR445_APPROVED", label: "CV DPR 445 approvato", description: "Quando il CV viene approvato", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "CV_DPR445_REJECTED", label: "CV DPR 445 rifiutato", description: "Quando il CV viene rifiutato con richiesta modifiche", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "MATERIAL_APPROVED", label: "Materiale approvato", description: "Quando un materiale caricato viene approvato", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },
  { type: "MATERIAL_REJECTED", label: "Materiale rifiutato", description: "Quando un materiale caricato viene rifiutato", category: "docente", roles: ["TEACHER"], hasInApp: true, hasEmail: false, locked: false, defaultInApp: true, defaultEmail: false },

  // === ADMIN — ANAGRAFICHE ===
  { type: "ADMIN_DEADLINE_REMINDER_7D", label: "Deadline anagrafiche (7gg)", description: "Client non hanno inviato a 7 giorni dalla scadenza", category: "anagrafiche", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "ADMIN_DEADLINE_REMINDER_2D", label: "Deadline anagrafiche (2gg)", description: "Client non hanno inviato a 2 giorni dalla scadenza", category: "anagrafiche", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "ADMIN_DEADLINE_TODAY", label: "Deadline anagrafiche (oggi)", description: "Avviso il giorno della scadenza", category: "anagrafiche", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "ADMIN_ALL_REGISTRIES_RECEIVED", label: "Anagrafiche complete", description: "Tutti i client hanno inviato per un'edizione", category: "anagrafiche", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ADMIN — CORSI ===
  { type: "ADMIN_COURSE_STARTING", label: "Corso in partenza domani", description: "Un corso inizia domani", category: "corsi", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ADMIN — DOCENTI ===
  { type: "ADMIN_CV_DPR445_SUBMITTED", label: "CV DPR 445 compilato", description: "Docente ha compilato il CV da approvare", category: "corsi", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },
  { type: "ADMIN_MATERIAL_PENDING", label: "Materiale da approvare", description: "Docente ha caricato materiale in attesa di approvazione", category: "materiali", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ADMIN — ACCOUNT ===
  { type: "ADMIN_ACCOUNT_LOCKED", label: "Account bloccato", description: "Un account e stato bloccato dopo tentativi falliti", category: "account", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ADMIN — PRESENZE ===
  { type: "ADMIN_ATTENDANCE_BELOW_MIN", label: "Presenze sotto soglia", description: "Dipendenti sotto la presenza minima richiesta", category: "presenze", roles: ["ADMIN"], hasInApp: true, hasEmail: true, locked: false, defaultInApp: true, defaultEmail: true },

  // === ADMIN — RIEPILOGO ===
  { type: "ADMIN_DAILY_SUMMARY", label: "Riepilogo giornaliero", description: "Email mattutina con panoramica di anagrafiche, corsi, ticket e account", category: "riepilogo", roles: ["ADMIN"], hasInApp: false, hasEmail: true, locked: false, defaultInApp: false, defaultEmail: true },
];

export function getNotificationTypesForRole(role: "ADMIN" | "CLIENT" | "TEACHER") {
  return NOTIFICATION_TYPES.filter((t) => t.roles.includes(role));
}

export function getCategoriesForRole(role: "ADMIN" | "CLIENT" | "TEACHER") {
  const types = getNotificationTypesForRole(role);
  const categoryIds = [...new Set(types.map((t) => t.category))];
  return NOTIFICATION_CATEGORIES.filter((c) => categoryIds.includes(c.id));
}
