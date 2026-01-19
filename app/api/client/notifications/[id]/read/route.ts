import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.notificationRead.upsert({ where: { notificationId_clientId: { notificationId: params.id, clientId } }, create: { notificationId: params.id, clientId }, update: {} })
  return NextResponse.json({ ok: true })
}
