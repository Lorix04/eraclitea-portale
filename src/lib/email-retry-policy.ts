export type EmailRetryClassification = {
  normalizedType: string;
  sensitive: boolean;
  retryable: boolean;
};

const SENSITIVE_EMAIL_TYPES = new Set([
  "WELCOME",
  "PASSWORD_RESET_ADMIN",
  "PASSWORD_RESET_REQUEST",
]);

const RETRYABLE_EMAIL_TYPES = new Set([
  "WELCOME",
  "PASSWORD_RESET_ADMIN",
  "PASSWORD_RESET_REQUEST",
  "NEW_EDITION",
  "REMINDER_DEADLINE_7D",
  "REMINDER_DEADLINE_2D",
  "CERTIFICATES_AVAILABLE",
  "CERTIFICATE_EXPIRING_60D",
  "CERTIFICATE_EXPIRING_30D",
  "REGISTRY_ISSUE",
  "REGISTRY_RECEIVED",
  "EDITION_DATES_CHANGED",
  "EDITION_CANCELLED",
  "ADMIN_REGISTRY_SUBMITTED",
  "ADMIN_DEADLINE_EXPIRED",
  "TEACHER_INVITE",
  "TEACHER_REMINDER",
  "LESSON_ASSIGNED",
  "LESSON_REMOVED",
  "LESSON_UPDATED",
  "GENERIC",
]);

export function normalizeEmailType(emailType: string | null | undefined): string {
  const normalized = String(emailType || "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : "GENERIC";
}

export function classifyEmailType(
  emailType: string | null | undefined
): EmailRetryClassification {
  const normalizedType = normalizeEmailType(emailType);
  const sensitive = SENSITIVE_EMAIL_TYPES.has(normalizedType);
  const retryable = RETRYABLE_EMAIL_TYPES.has(normalizedType) || normalizedType === "GENERIC";

  return {
    normalizedType,
    sensitive,
    retryable,
  };
}

export function isSensitiveEmailType(emailType: string | null | undefined): boolean {
  return classifyEmailType(emailType).sensitive;
}
