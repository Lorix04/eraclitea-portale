import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const status = sp.get('status') || undefined
  const search = sp.get('search') || undefined
  const now = new Date()
  const seven = new Date(now.getTime() - 7*24*60*60*1000)

  const where: any = {
    OR: [ { visibility: { none: {} } }, { visibility: { some: { clientId } } } ],
  }
  if (status) where.status = status
  if (search) where.OR.push({ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } })

  const skip = (page - 1) * limit
  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit })
  ])

  const courseIds = courses.map(c=>c.id)
  const regs = await prisma.courseRegistration.groupBy({ by: ['courseId'], _count: { courseId: true }, where: { clientId, courseId: { in: courseIds } } })
  const confRegs = await prisma.courseRegistration.groupBy({ by: ['courseId'], _count: { courseId: true }, where: { clientId, courseId: { in: courseIds }, status: 'CONFIRMED' } })
  const lastUpdates = await prisma.courseRegistration.findMany({ where: { clientId, courseId: { in: courseIds } }, orderBy: { updatedAt: 'desc' }, select: { courseId: true, updatedAt: true } })
  const certs = await prisma.certificate.groupBy({ by: ['courseId'], _count: { courseId: true }, where: { clientId, courseId: { in: courseIds } } })
  const regMap = new Map(regs.map(r=>[r.courseId, r._count.courseId]))
  const confMap = new Map(confRegs.map(r=>[r.courseId, r._count.courseId]))
  const lastMap = new Map(lastUpdates.map(r=>[r.courseId, r.updatedAt]))
  const certMap = new Map(certs.map(r=>[r.courseId, r._count.courseId]))

  const data = courses.map(c => {
    const registrationCount = regMap.get(c.id) || 0
    const confirmed = confMap.get(c.id) || 0
    const registrationStatus = registrationCount === 0 ? 'not_started' : (confirmed === registrationCount && registrationCount>0 ? 'submitted' : 'in_progress')
    const lastUpdated = lastMap.get(c.id) || null
    const certificatesCount = certMap.get(c.id) || 0
    const isNew = c.createdAt >= seven
    const isDeadlineSoon = c.deadlineRegistry ? (c.deadlineRegistry.getTime() - now.getTime())/(24*60*60*1000) <= 7 && (c.deadlineRegistry >= now) : false
    const isDeadlinePassed = c.deadlineRegistry ? c.deadlineRegistry < now : false
    return { ...c, clientData: { registrationCount, registrationStatus, lastUpdated, certificatesCount }, isNew, isDeadlineSoon, isDeadlinePassed }
  })
  const totalPages = Math.max(1, Math.ceil(total/limit))
  return NextResponse.json({ data, total, page, totalPages })
}
