import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  // DEMO: accept any token and reset first user; replace with proper token table lookup
  const user = await prisma.user.findFirst()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  await prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_RESET', metadata: { token } } })
  return NextResponse.json({ ok: true })
}
