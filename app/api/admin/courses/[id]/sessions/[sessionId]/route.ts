import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionPartialSchema } from '@/lib/validations/session'
import { z } from 'zod'
import { getClientIp, logAudit } from '@/lib/audit'

export async function PUT(req: Request, { params }: { params: { id: string, sessionId: string } }) {
  try {
    const sessionU = await auth()
    if (!sessionU || (sessionU.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = sessionPartialSchema.parse(body)
    const updated = await prisma.session.update({ where: { id: params.sessionId, }, data: parsed })
    await logAudit({ userId: (sessionU.user as any).id, action: 'SESSION_UPDATE', entityType: 'Session', entityId: params.sessionId, ipAddress: getClientIp(req) || undefined })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string, sessionId: string } }) {
  const sessionU = await auth()
  if (!sessionU || (sessionU.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.session.delete({ where: { id: params.sessionId } })
  await logAudit({ userId: (sessionU.user as any).id, action: 'SESSION_DELETE', entityType: 'Session', entityId: params.sessionId, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json({ ok: true })
}
