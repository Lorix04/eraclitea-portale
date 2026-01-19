import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const unreadOnly = sp.get('unreadOnly') === 'true'
  const limit = Math.max(1, Math.min(50, parseInt(sp.get('limit') || '20', 10)))

  // visible notifications: isGlobal OR targets include clientId OR notification.course visibility includes client
  const notifs = await prisma.notification.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { targets: { not: null } },
        { course: { visibility: { some: { clientId } } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { course: true },
  })
  const reads = await prisma.notificationRead.findMany({ where: { clientId } })
  const readSet = new Set(reads.map(r => r.notificationId))
  const filtered = notifs.filter(n => {
    const targeted = (n.targets as any)?.clientIds as string[] | undefined
    const visibleByTarget = targeted ? targeted.includes(clientId) : true
    const isRead = readSet.has(n.id)
    return visibleByTarget && (!unreadOnly || !isRead)
  })
  return NextResponse.json(filtered.map(n => ({ ...n, isRead: readSet.has(n.id) })))
}
