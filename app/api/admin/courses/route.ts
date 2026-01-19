import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { z } from 'zod'
import { courseSchema } from '@/lib/validations/course'
import { getEditionPackage } from '@/lib/edition-packages'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sp = new URL(req.url).searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
    const search = sp.get('search') || undefined
    const status = sp.get('status') || undefined
    const dateFrom = sp.get('dateFrom') ? new Date(sp.get('dateFrom')!) : undefined
    const dateTo = sp.get('dateTo') ? new Date(sp.get('dateTo')!) : undefined
    const packageId = sp.get('package') || undefined

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status
    if (dateFrom || dateTo) {
      // filter by dateStart within range if present
      where.dateStart = {}
      if (dateFrom) where.dateStart.gte = dateFrom
      if (dateTo) where.dateStart.lte = dateTo
    }
    if (packageId) {
      const pkg = getEditionPackage(packageId)
      if (pkg) {
        const from = new Date(pkg.dateFrom)
        const to = new Date(pkg.dateTo)
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { dateStart: { gte: from, lte: to } },
              { dateEnd: { gte: from, lte: to } },
            ],
          },
        ]
      }
    }

    const skip = (page - 1) * limit
    const [total, data] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { registrations: true } } },
      }),
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return NextResponse.json({ data, total, page, totalPages })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const parsed = courseSchema.partial({ status: true }).parse(body)
    const created = await prisma.course.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        dateStart: parsed.dateStart,
        dateEnd: parsed.dateEnd,
        deadlineRegistry: parsed.deadlineRegistry,
        status: (body.status as any) || 'DRAFT',
      },
    })
    await logAudit({
      userId: (session.user as any).id,
      action: 'COURSE_CREATE',
      entityType: 'Course',
      entityId: created.id,
      ipAddress: getClientIp(req) || undefined,
      metadata: { title: created.title },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
