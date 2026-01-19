import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { employeeSchema } from '@/lib/validations/employee'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const skip = (page - 1) * limit
  const [total, regs, sessionsCount] = await Promise.all([
    prisma.courseRegistration.count({ where: { courseId: params.id } }),
    prisma.courseRegistration.findMany({ where: { courseId: params.id }, include: { employee: true, client: true }, orderBy: { insertedAt: 'desc' }, skip, take: limit }),
    prisma.session.count({ where: { courseId: params.id } }),
  ])

  const presCounts = await prisma.sessionAttendance.groupBy({ by: ['employeeId'], _sum: { isPresent: true as any }, where: { session: { courseId: params.id }, isPresent: true } as any }).catch(()=>[] as any)
  const presMap = new Map<string, number>(presCounts.map((x: any) => [x.employeeId, x._sum.isPresent || 0]))
  const certs = await prisma.certificate.findMany({ where: { courseId: params.id }, select: { employeeId: true } })
  const certSet = new Set(certs.map(c => c.employeeId))
  const data = regs.map(r => ({ ...r, presenceSummary: `${presMap.get(r.employeeId) || 0}/${sessionsCount}`, hasCertificate: certSet.has(r.employeeId) }))
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return NextResponse.json({ data, total, page, totalPages })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { employees } = await req.json()
    if (!Array.isArray(employees)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    let created = 0, updated = 0
    const errors: any[] = []
    for (const e of employees) {
      try {
        const val = employeeSchema.partial({ dataNascita: true, codiceFiscale: true }).parse(e)
        const clientId = e.clientId as string
        if (!clientId) throw new Error('clientId required')
        const emp = await prisma.employee.upsert({
          where: { clientId_codiceFiscale: { clientId, codiceFiscale: val.codiceFiscale! } },
          create: { clientId, nome: val.nome!, cognome: val.cognome!, codiceFiscale: val.codiceFiscale!, email: val.email, luogoNascita: val.luogoNascita, dataNascita: val.dataNascita ? new Date(val.dataNascita) : null, mansione: val.mansione, note: val.note },
          update: { nome: val.nome, cognome: val.cognome, email: val.email, luogoNascita: val.luogoNascita, dataNascita: val.dataNascita ? new Date(val.dataNascita) : undefined, mansione: val.mansione, note: val.note },
        })
        await prisma.courseRegistration.upsert({ where: { courseId_employeeId: { courseId: params.id, employeeId: emp.id } }, create: { courseId: params.id, employeeId: emp.id, clientId }, update: {} })
        created++
      } catch (err: any) {
        updated++ // count updates or treat as processed
        errors.push({ cf: e.codiceFiscale, error: err.message })
      }
    }
    await logAudit({ userId: (session.user as any).id, action: 'REGISTRATIONS_BATCH_UPDATE', entityType: 'Course', entityId: params.id, ipAddress: getClientIp(req) || undefined, metadata: { created, updated, errors: errors.length } })
    return NextResponse.json({ created, updated, errors })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
