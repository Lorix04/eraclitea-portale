import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { attendanceSchema } from '@/lib/validations/attendance'
import { z } from 'zod'

export async function GET(_: Request, { params }: { params: { id: string, sessionId: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const regs = await prisma.courseRegistration.findMany({ where: { courseId: params.id }, include: { employee: true } })
  const att = await prisma.sessionAttendance.findMany({ where: { sessionId: params.sessionId } })
  const map = new Map(att.map(a => [a.employeeId, a]))
  const data = regs.map(r => ({ employee: r.employee, isPresent: map.get(r.employeeId)?.isPresent ?? false, note: map.get(r.employeeId)?.note ?? null }))
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: { id: string, sessionId: string } }) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = attendanceSchema.parse(body)
    const up = await prisma.sessionAttendance.upsert({
      where: { sessionId_employeeId: { sessionId: params.sessionId, employeeId: parsed.employeeId } },
      create: { sessionId: params.sessionId, employeeId: parsed.employeeId, isPresent: parsed.isPresent, note: parsed.note },
      update: { isPresent: parsed.isPresent, note: parsed.note },
    })
    return NextResponse.json(up)
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
