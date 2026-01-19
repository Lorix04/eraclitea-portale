import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sessionSchema } from '@/lib/validations/session'
import { getClientIp, logAudit } from '@/lib/audit'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessions = await prisma.session.findMany({ where: { courseId: params.id }, orderBy: { date: 'asc' }, include: { _count: { select: { attendances: { where: { isPresent: true } } as any } } } as any })
  return NextResponse.json(sessions)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const sessionU = await auth()
    if (!sessionU || (sessionU.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = sessionSchema.parse(body)
    const created = await prisma.session.create({ data: { ...parsed, courseId: params.id } })
    await logAudit({ userId: (sessionU.user as any).id, action: 'SESSION_CREATE', entityType: 'Session', entityId: created.id, ipAddress: getClientIp(req) || undefined })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
