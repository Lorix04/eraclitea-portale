import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getClientIp, logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const user = await prisma.user.findFirst({ where: { clientId: client.id, email: client.referenteEmail.toLowerCase() } })
  if (!user) return NextResponse.json({ error: 'Referente user not found' }, { status: 404 })
  const newPass = randomUUID().slice(0, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPass, 10) } })
  await sendPasswordResetEmail(client.referenteEmail, `Nuova password temporanea: ${newPass}`)
  await logAudit({ userId: (session.user as any).id, action: 'CLIENT_RESET_PASSWORD', entityType: 'Client', entityId: client.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json({ ok: true })
}
