import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp, logAudit } from '@/lib/audit'

export async function DELETE(req: Request, { params }: { params: { id: string, registrationId: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.courseRegistration.delete({ where: { id: params.registrationId } })
  await logAudit({ userId: (session.user as any).id, action: 'REGISTRATION_DELETE', entityType: 'CourseRegistration', entityId: params.registrationId, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json({ ok: true })
}
