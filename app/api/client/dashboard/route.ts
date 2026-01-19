import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = new Date()
  const in30 = new Date(now.getTime() + 30*24*60*60*1000)
  const sevenDaysAgo = new Date(now.getTime() - 7*24*60*60*1000)

  const [totalEmployees, certificatesTotal, certificatesExpiring, certificatesExpired] = await Promise.all([
    prisma.employee.count({ where: { clientId } }),
    prisma.certificate.count({ where: { clientId } }),
    prisma.certificate.count({ where: { clientId, expiresAt: { gte: now, lte: in30 } } }),
    prisma.certificate.count({ where: { clientId, expiresAt: { lt: now } } }),
  ])

  const coursesCompleted = await prisma.courseRegistration
    .findMany({
      where: { clientId, course: { status: { in: ['CLOSED', 'ARCHIVED'] } } },
      select: { courseId: true },
      distinct: ['courseId'],
    })
    .then((r: Array<{ courseId: string }>) => r.length)

  const visibleCourses = await prisma.course.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { visibility: { none: {} } },
        { visibility: { some: { clientId } } },
      ],
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, dateStart: true, dateEnd: true, deadlineRegistry: true },
  })

  const openCourses = await prisma.course.findMany({ where: { status: 'PUBLISHED', OR: [ { visibility: { none: {} } }, { visibility: { some: { clientId } } } ] }, select: { id: true, title: true, deadlineRegistry: true } })
  const regsByCourse = await prisma.courseRegistration.groupBy({ by: ['courseId'], _count: { courseId: true }, where: { clientId } })
  const regMap = new Map(
    (regsByCourse as Array<{ courseId: string; _count: { courseId: number } }>).map((r) => [r.courseId, r._count.courseId])
  )
  const pendingRegistrations = openCourses.slice(0, 5).map((c: { id: string; title: string; deadlineRegistry: Date | null }) => {
    const count = regMap.get(c.id) || 0
    const status = count === 0 ? 'not_started' : 'in_progress'
    return { courseId: c.id, courseTitle: c.title, deadline: c.deadlineRegistry, registeredCount: count, status }
  })

  const recentCertificatesRaw = await prisma.certificate.findMany({ where: { clientId, uploadedAt: { gte: new Date(now.getTime() - 30*24*60*60*1000) } }, include: { employee: true, course: true }, orderBy: { uploadedAt: 'desc' }, take: 5 })
  const recentCertificates = recentCertificatesRaw.map((c: any) => ({ id: c.id, employeeName: `${c.employee.cognome} ${c.employee.nome}`, courseName: c.course.title, achievedAt: c.achievedAt || c.uploadedAt, expiresAt: c.expiresAt || undefined }))

  const unreadReads = await prisma.notificationRead.count({ where: { clientId } })
  const notifs = await prisma.notification.findMany({ where: { OR: [ { isGlobal: true }, { course: { visibility: { some: { clientId } } } } ] } })
  const unreadNotifications = notifs.length - unreadReads

  return NextResponse.json({
    stats: { totalEmployees, coursesCompleted, certificatesTotal, certificatesExpiring, certificatesExpired },
    newCourses: visibleCourses,
    pendingRegistrations,
    recentCertificates,
    unreadNotifications: Math.max(0, unreadNotifications),
  })
}
