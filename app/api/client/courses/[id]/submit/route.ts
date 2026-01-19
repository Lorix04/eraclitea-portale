import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.courseRegistration.updateMany({ where: { courseId: params.id, clientId, status: 'INSERTED' }, data: { status: 'CONFIRMED' } })
  await logAudit({ userId: (session.user as any).id, action: 'REGISTRATIONS_SUBMITTED', entityType: 'Course', entityId: params.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json({ ok: true })
}
