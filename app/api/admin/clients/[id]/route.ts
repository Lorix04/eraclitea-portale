import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { clientSchema } from '@/lib/validations/client'
import { z } from 'zod'
import { getClientIp, logAudit } from '@/lib/audit'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { users: true, _count: { select: { employees: true, courseRegistrations: true, certificates: true } } },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = clientSchema.partial().parse(body)
    const updated = await prisma.client.update({ where: { id: params.id }, data: parsed })
    await logAudit({ userId: (session.user as any).id, action: 'CLIENT_UPDATE', entityType: 'Client', entityId: params.id, ipAddress: getClientIp(req) || undefined })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
