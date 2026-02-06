import { prisma } from "@/lib/prisma";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "COURSE_CREATE"
  | "COURSE_UPDATE"
  | "COURSE_PUBLISH"
  | "COURSE_ARCHIVE"
  | "COURSE_DELETE"
  | "EMPLOYEE_CREATE"
  | "EMPLOYEE_UPDATE"
  | "EMPLOYEE_DELETE"
  | "CLIENT_CREATE"
  | "CLIENT_UPDATE"
  | "CLIENT_TOGGLE_STATUS"
  | "CATEGORY_CREATE"
  | "CATEGORY_UPDATE"
  | "CATEGORY_DELETE"
  | "REGISTRY_SUBMIT"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGE"
  | "CERT_UPLOAD"
  | "CERTIFICATE_UPLOAD"
  | "CERTIFICATE_DELETE"
  | "CERT_DOWNLOAD"
  | "CSV_EXPORT"
  | "REGISTRY_UPDATE";

type AuditParams = {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
};

export async function logAudit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
