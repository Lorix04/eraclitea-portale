import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { sendNotificationEmail } from '@/lib/email'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const course = await prisma.course.findUnique({ where: { id: params.id } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT can be published' }, { status: 400 })
  const updated = await prisma.course.update({ where: { id: params.id }, data: { status: 'PUBLISHED' } })
  // Determine targets (clients with visibility if set) else global
  const visibility = await prisma.courseVisibility.findMany({ where: { courseId: updated.id } })
  const isGlobal = visibility.length === 0
  const targets = !isGlobal ? { clientIds: visibility.map(v => v.clientId) } : undefined
  await prisma.notification.create({ data: { type: 'COURSE_PUBLISHED', title: 'Corso pubblicato', message: `Il corso ${updated.title} è stato pubblicato.`, courseId: updated.id, isGlobal, targets: targets as any } })
  if (!isGlobal && visibility.length) {
    const clients = await prisma.client.findMany({ where: { id: { in: visibility.map(v => v.clientId) } } })
    await sendNotificationEmail('COURSE_PUBLISHED' as any, clients.map(c => ({ email: c.referenteEmail, name: c.referenteNome })), { clientName: '', courseName: updated.title, courseDate: updated.dateStart ? new Date(updated.dateStart).toLocaleDateString('it-IT') : '', deadline: updated.deadlineRegistry ? new Date(updated.deadlineRegistry).toLocaleDateString('it-IT') : '', portalUrl: process.env.NEXT_PUBLIC_APP_URL || '' })
  }
  await logAudit({ userId: (session.user as any).id, action: 'COURSE_PUBLISH', entityType: 'Course', entityId: updated.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json(updated)
}
