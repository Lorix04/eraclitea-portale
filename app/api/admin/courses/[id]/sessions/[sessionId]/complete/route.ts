import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_: Request, { params }: { params: { id: string, sessionId: string } }) {
  const sessionU = await auth()
  if (!sessionU || (sessionU.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const updated = await prisma.session.update({ where: { id: params.sessionId }, data: { isCompleted: true } })
  return NextResponse.json(updated)
}
