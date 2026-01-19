import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadBuffer } from '@/lib/s3'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  const courseId = String(form.get('courseId') || '')
  const employeeId = String(form.get('employeeId') || '')
  const clientId = String(form.get('clientId') || '')
  const achievedAt = form.get('achievedAt') ? new Date(String(form.get('achievedAt'))) : null
  const expiresAt = form.get('expiresAt') ? new Date(String(form.get('expiresAt'))) : null
  const tipo = String(form.get('tipo') || 'Attestato')
  if (!file || !courseId || !employeeId || !clientId) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File non valido' }, { status: 400 })

  const [course, employee, client] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.client.findUnique({ where: { id: clientId } }),
  ])
  if (!course || !employee || !client) return NextResponse.json({ error: 'Riferimenti non validi' }, { status: 404 })
  if (employee.clientId !== clientId) return NextResponse.json({ error: 'Dipendente non appartiene al cliente' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const timestamp = Date.now()
  const key = `certificates/${clientId}/${courseId}/${employee.codiceFiscale}_${timestamp}.pdf`
  await uploadBuffer(key, Buffer.from(arrayBuffer), 'application/pdf')
  const created = await prisma.certificate.create({ data: { clientId, courseId, employeeId, filePath: key, fileName: file.name, fileSize: file.size, achievedAt: achievedAt || undefined, expiresAt: expiresAt || undefined, uploadedById: (session.user as any).id } })
  await logAudit({ userId: (session.user as any).id, action: 'CERT_UPLOAD', entityType: 'Certificate', entityId: created.id, ipAddress: getClientIp(req) || undefined })
  return NextResponse.json(created, { status: 201 })
}
