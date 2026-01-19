import { prisma } from '@/lib/prisma'

export async function logAudit(params: {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  ipAddress?: string
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        metadata: params.metadata as any,
      },
    })
  } catch (e) {
    // swallow
    console.error('Audit log error', e)
  }
}

export function getClientIp(request: Request): string | null {
  // Try common headers
  const headers = request.headers
  const xff = headers.get('x-forwarded-for') || headers.get('x-real-ip')
  if (xff) return xff.split(',')[0].trim()
  return null
}
