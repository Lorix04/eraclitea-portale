import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadBuffer } from '@/lib/s3'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const ambito = sp.get('ambito') || undefined
  const tipo = sp.get('tipo') || undefined
  const isInternal = sp.get('isInternal')
  const where: any = { courseId: params.id }
  if (ambito) where.ambito = ambito
  if (tipo) where.tipo = tipo
  if (typeof isInternal === 'string') where.isInternal = isInternal === 'true'
  const items = await prisma.courseAttachment.findMany({ where, orderBy: { uploadedAt: 'desc' } })
  return NextResponse.json(items)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  const ambito = String(form.get('ambito') || 'Edizione')
  const tipo = String(form.get('tipo') || 'Documento')
  const description = String(form.get('description') || '') || null
  const isInternal = String(form.get('isInternal') || 'false') === 'true'
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  const arrayBuffer = await file.arrayBuffer()
  const key = `attachments/${params.id}/${file.name}`
  await uploadBuffer(key, Buffer.from(arrayBuffer), file.type || 'application/octet-stream')
  const created = await prisma.courseAttachment.create({ data: { courseId: params.id, ambito, tipo, fileName: file.name, filePath: key, fileSize: file.size, description, isInternal } })
  await logAudit({ userId: (session.user as any).id, action: 'ATTACHMENT_UPLOAD', entityType: 'CourseAttachment', entityId: created.id, ipAddress: getClientIp(req) || undefined, metadata: { key } })
  return NextResponse.json(created, { status: 201 })
}
