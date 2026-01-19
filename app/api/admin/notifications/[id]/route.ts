import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.notificationRead.deleteMany({ where: { notificationId: params.id } })
  await prisma.notification.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
