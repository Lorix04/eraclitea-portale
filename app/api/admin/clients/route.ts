import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { clientSchema } from '@/lib/validations/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { getClientIp, logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '10', 10)))
  const search = sp.get('search') || undefined
  const isActive = sp.get('isActive')

  const where: any = {}
  if (typeof isActive === 'string') where.isActive = isActive === 'true'
  if (search) {
    where.OR = [
      { ragioneSociale: { contains: search, mode: 'insensitive' } },
      { piva: { contains: search, mode: 'insensitive' } },
      { referenteEmail: { contains: search, mode: 'insensitive' } },
    ]
  }
  const skip = (page - 1) * limit
  const [total, data] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { employees: true, courseRegistrations: true } } },
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return NextResponse.json({ data, total, page, totalPages })
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = clientSchema.parse(body)
    const client = await prisma.client.create({ data: parsed })

    const tempPassword = randomUUID().slice(0, 10)
    const user = await prisma.user.create({
      data: {
        email: parsed.referenteEmail.toLowerCase(),
        passwordHash: await bcrypt.hash(tempPassword, 10),
        role: 'CLIENT',
        clientId: client.id,
      },
    })

    await sendPasswordResetEmail(parsed.referenteEmail, `Credenziali temporanee: ${tempPassword}`)
    await logAudit({ userId: (session.user as any).id, action: 'CLIENT_CREATE', entityType: 'Client', entityId: client.id, ipAddress: getClientIp(req) || undefined, metadata: { email: user.email } })
    return NextResponse.json({ client, user }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 })
    if (e.code === 'P2002') return NextResponse.json({ error: 'P.IVA o Email già esistente' }, { status: 409 })
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
