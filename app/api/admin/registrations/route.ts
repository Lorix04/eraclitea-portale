import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const courseId = sp.get('courseId') || undefined
  const clientId = sp.get('clientId') || undefined
  const status = sp.get('status') || undefined
  const search = sp.get('search') || undefined

  const where: any = {}
  if (courseId) where.courseId = courseId
  if (clientId) where.clientId = clientId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { employee: { nome: { contains: search, mode: 'insensitive' } } },
      { employee: { cognome: { contains: search, mode: 'insensitive' } } },
      { employee: { codiceFiscale: { contains: search, mode: 'insensitive' } } },
    ]
  }
  const skip = (page - 1) * limit
  const [total, items] = await Promise.all([
    prisma.courseRegistration.count({ where }),
    prisma.courseRegistration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { insertedAt: 'desc' },
      include: { employee: true, course: true, client: true },
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return NextResponse.json({ data: items, total, page, totalPages })
}
