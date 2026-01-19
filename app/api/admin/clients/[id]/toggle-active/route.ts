import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getClientIp, logAudit } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const newActive = !client.isActive
  const updated = await prisma.client.update({ where: { id: params.id }, data: { isActive: newActive } })
  await prisma.user.updateMany({ where: { clientId: params.id }, data: { isActive: newActive } })
  await logAudit({ userId: (session.user as any).id, action: 'CLIENT_TOGGLE_ACTIVE', entityType: 'Client', entityId: params.id, ipAddress: getClientIp(req) || undefined, metadata: { isActive: newActive } })
  return NextResponse.json(updated)
}
