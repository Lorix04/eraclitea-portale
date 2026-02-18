import type { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";

export const TICKET_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export const TICKET_CATEGORY_VALUES = [
  "TECHNICAL",
  "INFO_REQUEST",
  "REGISTRY",
  "CERTIFICATES",
  "BILLING",
  "OTHER",
] as const;

export const TICKET_PRIORITY_VALUES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export const TICKET_ATTACHMENT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const TICKET_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const TICKET_ATTACHMENT_MAX_FILES = 3;

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aperto",
  IN_PROGRESS: "In corso",
  RESOLVED: "Risolto",
  CLOSED: "Chiuso",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  TECHNICAL: "Problema tecnico",
  INFO_REQUEST: "Richiesta informazioni",
  REGISTRY: "Anagrafiche / Registrazioni",
  CERTIFICATES: "Attestati",
  BILLING: "Fatturazione",
  OTHER: "Altro",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUS_VALUES as readonly string[]).includes(value);
}

export function isTicketCategory(value: string): value is TicketCategory {
  return (TICKET_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function isTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITY_VALUES as readonly string[]).includes(value);
}

