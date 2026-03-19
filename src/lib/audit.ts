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
  | "REGISTRY_UPDATE"
  | "IMPERSONATE_START"
  | "IMPERSONATE_STOP"
  | "IMPERSONATE_TEACHER_START"
  | "IMPERSONATE_TEACHER_STOP"
  | "MATERIAL_UPLOAD"
  | "MATERIAL_DELETE";

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
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const ips = xff.split(",").map((s) => s.trim());
    const hops = parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10);
    const idx = Math.max(0, ips.length - hops);
    if (ips[idx]) return ips[idx];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
