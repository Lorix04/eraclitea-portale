import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const course = await prisma.course.findUnique({ where: { id: params.id } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.course.update({ where: { id: params.id }, data: { status: 'CLOSED' } })
  await logAudit({ userId: (session.user as any).id, action: 'COURSE_CLOSE', entityType: 'Course', entityId: updated.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json(updated)
}
