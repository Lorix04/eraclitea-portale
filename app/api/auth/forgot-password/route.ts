import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  const { email } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (user) {
    const token = randomUUID()
    await prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_FORGOT', metadata: { email } } })
    // Store token temporarily in AuditLog metadata for demo; in production create a dedicated table
    const link = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    await sendPasswordResetEmail(email, link)
  }
  return NextResponse.json({ ok: true })
}
