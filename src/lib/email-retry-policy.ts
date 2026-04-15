export type EmailRetryClassification = {
  normalizedType: string;
  sensitive: boolean;
  retryable: boolean;
};

const SENSITIVE_EMAIL_TYPES = new Set([
  "WELCOME",
  "PASSWORD_RESET_ADMIN",
  "PASSWORD_RESET_REQUEST",
  "ADMIN_INVITE",
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
  "ADMIN_INVITE",
  "LESSON_ASSIGNED",
  "LESSON_REMOVED",
  "LESSON_UPDATED",
  "CV_DPR445_REQUEST",
  "CV_DPR445_REMINDER",
  "CV_DPR445_APPROVED",
  "CV_DPR445_REJECTED",
  "REGISTRY_CONFIRMED",
  "DEADLINE_EXPIRED",
  "COURSE_COMPLETED",
  "TICKET_CLOSED",
  "WEEKLY_SUMMARY",
  "EDITION_INFO_CHANGED",
  "DEADLINE_TODAY",
  "COURSE_STARTING_TOMORROW",
  "REGISTRY_REJECTED",
  "CERTIFICATE_EXPIRED",
  "CERTIFICATE_RENEWED",
  "ATTENDANCE_BELOW_MINIMUM",
  "ATTENDANCE_SUMMARY",
  "PASSWORD_CHANGED",
  "ACCOUNT_UNLOCKED",
  "TICKET_REOPENED",
  "ADMIN_DEADLINE_REMINDER_7D",
  "ADMIN_DEADLINE_REMINDER_2D",
  "ADMIN_DEADLINE_TODAY",
  "ADMIN_COURSE_STARTING",
  "ADMIN_ALL_REGISTRIES_RECEIVED",
  "ADMIN_CV_DPR445_SUBMITTED",
  "ADMIN_MATERIAL_PENDING",
  "ADMIN_ACCOUNT_LOCKED",
  "ADMIN_ATTENDANCE_BELOW_MIN",
  "ADMIN_DAILY_SUMMARY",
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
