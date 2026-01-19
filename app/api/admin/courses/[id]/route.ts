import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { courseSchema } from '@/lib/validations/course'
import { logAudit, getClientIp } from '@/lib/audit'
import { z } from 'zod'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      visibility: { include: { client: true } },
      _count: { select: { registrations: true, certificates: true } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...course, sessions: [] })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const existing = await prisma.course.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'ARCHIVED') return NextResponse.json({ error: 'Course archived' }, { status: 400 })
    const body = await req.json()
    const parsed = courseSchema.partial().parse(body)
    const updated = await prisma.course.update({
      where: { id: params.id },
      data: {
        title: parsed.title ?? existing.title,
        description: parsed.description ?? existing.description,
        category: parsed.category ?? existing.category,
        dateStart: parsed.dateStart ?? existing.dateStart,
        dateEnd: parsed.dateEnd ?? existing.dateEnd,
        deadlineRegistry: parsed.deadlineRegistry ?? existing.deadlineRegistry,
        status: parsed.status ?? existing.status,
      },
    })
    await logAudit({ userId: (session.user as any).id, action: 'COURSE_UPDATE', entityType: 'Course', entityId: updated.id, ipAddress: getClientIp(req) || undefined })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const existing = await prisma.course.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const archived = await prisma.course.update({ where: { id: params.id }, data: { status: 'ARCHIVED' } })
  await logAudit({ userId: (session.user as any).id, action: 'COURSE_ARCHIVE', entityType: 'Course', entityId: params.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json(archived)
}
