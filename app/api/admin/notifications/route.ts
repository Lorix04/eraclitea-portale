import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotificationSchema } from '@/lib/validations/notification'
import { z } from 'zod'
import { sendNotificationEmail } from '@/lib/email'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const skip = (page - 1) * limit
  const [total, items] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit, include: { course: true, reads: true } }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return NextResponse.json({ data: items.map(n => ({ ...n, readers: n.reads.length })), total, page, totalPages })
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = createNotificationSchema.parse(body)
    const created = await prisma.notification.create({ data: { type: parsed.type as any, title: parsed.title, message: parsed.message, courseId: parsed.courseId, isGlobal: parsed.isGlobal, targets: parsed.targetClientIds ? { clientIds: parsed.targetClientIds } as any : undefined } })

    if (parsed.sendEmail) {
      let recipients: { email: string; name: string }[] = []
      if (parsed.isGlobal) {
        const clients = await prisma.client.findMany({ where: { isActive: true } })
        recipients = clients.map(c => ({ email: c.referenteEmail, name: c.referenteNome }))
      } else if (parsed.targetClientIds?.length) {
        const clients = await prisma.client.findMany({ where: { id: { in: parsed.targetClientIds } } })
        recipients = clients.map(c => ({ email: c.referenteEmail, name: c.referenteNome }))
      }
      await sendNotificationEmail(parsed.type as any, recipients, { clientName: 'Cliente', courseName: parsed.title, courseDate: '', deadline: '', portalUrl: process.env.NEXT_PUBLIC_APP_URL || '' })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
