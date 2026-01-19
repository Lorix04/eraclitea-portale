import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const course = await prisma.course.findUnique({ where: { id: params.id }, include: { visibility: true } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const visible = course.visibility.length === 0 || course.visibility.some(v=>v.clientId===clientId)
  if (!visible) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employees = await prisma.courseRegistration.findMany({ where: { courseId: params.id, clientId }, include: { employee: true } })
  return NextResponse.json({ course, employees })
}
