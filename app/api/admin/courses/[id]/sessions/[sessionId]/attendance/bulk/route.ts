import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bulkAttendanceSchema } from '@/lib/validations/attendance'
import { z } from 'zod'

export async function PUT(req: Request, { params }: { params: { id: string, sessionId: string } }) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = bulkAttendanceSchema.parse(body)
    await prisma.$transaction(parsed.attendances.map(a =>
      prisma.sessionAttendance.upsert({
        where: { sessionId_employeeId: { sessionId: params.sessionId, employeeId: a.employeeId } },
        create: { sessionId: params.sessionId, employeeId: a.employeeId, isPresent: a.isPresent, note: a.note },
        update: { isPresent: a.isPresent, note: a.note },
      })
    ))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
