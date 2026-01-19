import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const courseId = sp.get('courseId') || undefined
  const employeeId = sp.get('employeeId') || undefined
  const year = sp.get('year') ? parseInt(sp.get('year')!, 10) : undefined
  const status = sp.get('status') || undefined
  const now = new Date()
  const in30 = new Date(now.getTime() + 30*24*60*60*1000)

  const where: any = { clientId }
  if (courseId) where.courseId = courseId
  if (employeeId) where.employeeId = employeeId
  if (year) where.achievedAt = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) }

  const certsRaw = await prisma.certificate.findMany({ where, include: { employee: true, course: true }, orderBy: { uploadedAt: 'desc' } })
  const mapped = certsRaw.map(c => {
    const s = c.expiresAt ? (c.expiresAt < now ? 'expired' : (c.expiresAt <= in30 ? 'expiring' : 'valid')) : 'valid'
    return { id: c.id, employee: { id: c.employee.id, nome: c.employee.nome, cognome: c.employee.cognome, codiceFiscale: c.employee.codiceFiscale }, course: { id: c.course.id, title: c.course.title }, achievedAt: c.achievedAt, expiresAt: c.expiresAt, fileName: c.fileName, status: s }
  })
  const filtered = status ? mapped.filter(m => m.status === status) : mapped
  const total = filtered.length
  const start = (page - 1) * limit
  const data = filtered.slice(start, start + limit)

  const stats = {
    total: mapped.length,
    valid: mapped.filter(m => m.status==='valid').length,
    expiring: mapped.filter(m => m.status==='expiring').length,
    expired: mapped.filter(m => m.status==='expired').length,
  }

  return NextResponse.json({ data, total, stats })
}
