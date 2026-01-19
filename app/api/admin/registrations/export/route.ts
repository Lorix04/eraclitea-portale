import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { stringify } from 'csv-stringify/sync'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const courseId = sp.get('courseId') || undefined
  const clientId = sp.get('clientId') || undefined
  const sep = sp.get('separator') === 'semicolon' ? ';' : ','

  const where: any = {}
  if (courseId) where.courseId = courseId
  if (clientId) where.clientId = clientId

  const rows = await prisma.courseRegistration.findMany({
    where,
    include: { employee: true, course: true, client: true },
    orderBy: { insertedAt: 'desc' },
  })

  const records = rows.map(r => ({
    Corso: r.course.title,
    Cliente: r.client.ragioneSociale,
    Nome: r.employee.nome,
    Cognome: r.employee.cognome,
    CF: r.employee.codiceFiscale,
    DataNascita: r.employee.dataNascita ? new Date(r.employee.dataNascita).toISOString().slice(0,10) : '',
    LuogoNascita: r.employee.luogoNascita || '',
    Email: r.employee.email || '',
    Mansione: r.employee.mansione || '',
    Stato: r.status,
    DataIscrizione: new Date(r.insertedAt).toISOString(),
  }))

  const csv = '\uFEFF' + stringify(records, { header: true, delimiter: sep })
  const headers = new Headers({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="registrations.csv"',
  })

  await logAudit({ userId: (session.user as any).id, action: 'CSV_EXPORT', entityType: 'CourseRegistration', ipAddress: getClientIp(req) || undefined, metadata: { courseId, clientId, sep } })
  return new NextResponse(csv, { headers })
}
