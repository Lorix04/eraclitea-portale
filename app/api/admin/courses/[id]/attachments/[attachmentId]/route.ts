import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteObject } from '@/lib/s3'
import { getClientIp, logAudit } from '@/lib/audit'

export async function DELETE(req: Request, { params }: { params: { id: string, attachmentId: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const att = await prisma.courseAttachment.findUnique({ where: { id: params.attachmentId } })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await deleteObject(att.filePath)
  await prisma.courseAttachment.delete({ where: { id: params.attachmentId } })
  await logAudit({ userId: (session.user as any).id, action: 'ATTACHMENT_DELETE', entityType: 'CourseAttachment', entityId: params.attachmentId, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json({ ok: true })
}
