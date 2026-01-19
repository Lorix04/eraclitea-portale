import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifs = await prisma.notification.findMany({ where: { OR: [ { isGlobal: true }, { targets: { not: null } }, { course: { visibility: { some: { clientId } } } } ] } })
  const reads = await prisma.notificationRead.findMany({ where: { clientId } })
  const readSet = new Set(reads.map(r => r.notificationId))
  const count = notifs.filter(n => {
    const targeted = (n.targets as any)?.clientIds as string[] | undefined
    const visibleByTarget = targeted ? targeted.includes(clientId) : true
    return visibleByTarget && !readSet.has(n.id)
  }).length
  return NextResponse.json({ count })
}
