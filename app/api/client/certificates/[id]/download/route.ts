import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedCertificateUrl } from '@/lib/s3'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cert = await prisma.certificate.findUnique({ where: { id: params.id } })
  if (!cert || cert.clientId !== clientId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await logAudit({ userId: (session.user as any).id, action: 'CERT_DOWNLOAD', entityType: 'Certificate', entityId: cert.id, ipAddress: getClientIp(req) || undefined })
  const url = await getSignedCertificateUrl(cert.filePath, 900)
  return NextResponse.json({ url })
}
