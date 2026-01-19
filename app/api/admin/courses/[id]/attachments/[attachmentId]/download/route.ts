import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedCertificateUrl } from '@/lib/s3'

export async function GET(_: Request, { params }: { params: { id: string, attachmentId: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const att = await prisma.courseAttachment.update({ where: { id: params.attachmentId }, data: { downloadCount: { increment: 1 }, downloadedAt: new Date() } })
  const url = await getSignedCertificateUrl(att.filePath, 900)
  return NextResponse.json({ url })
}
