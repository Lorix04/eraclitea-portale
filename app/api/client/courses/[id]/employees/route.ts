import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { clientEmployeeBatchSchema } from '@/lib/validations/client-employee'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const regs = await prisma.courseRegistration.findMany({ where: { courseId: params.id, clientId }, include: { employee: true } })
  return NextResponse.json(regs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const clientId = (session?.user as any)?.clientId as string | undefined
    if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = clientEmployeeBatchSchema.parse(body)
    let saved = 0, created = 0, updated = 0
    const errors: any[] = []
    for (const e of parsed.employees) {
      try {
        const emp = await prisma.employee.upsert({
          where: { clientId_codiceFiscale: { clientId, codiceFiscale: e.codiceFiscale } },
          create: { clientId, nome: e.nome, cognome: e.cognome, codiceFiscale: e.codiceFiscale, email: e.email || null, luogoNascita: e.luogoNascita, dataNascita: e.dataNascita || undefined, mansione: e.mansione, note: e.note },
          update: { nome: e.nome, cognome: e.cognome, email: e.email || null, luogoNascita: e.luogoNascita, dataNascita: e.dataNascita || undefined, mansione: e.mansione, note: e.note },
        })
        const reg = await prisma.courseRegistration.upsert({ where: { courseId_employeeId: { courseId: params.id, employeeId: emp.id } }, create: { courseId: params.id, employeeId: emp.id, clientId }, update: {} })
        saved++; if (reg) created++
      } catch (ee:any) { errors.push({ cf: e.codiceFiscale, error: ee.message }); updated++ }
    }
    await logAudit({ userId: (session.user as any).id, action: 'EMPLOYEE_BATCH_SAVE', entityType: 'Course', entityId: params.id, ipAddress: getClientIp(req) || undefined, metadata: { saved, created, updated, errors: errors.length } })
    return NextResponse.json({ saved, created, updated, errors })
  } catch (e:any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
