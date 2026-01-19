import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadBuffer } from '@/lib/s3'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const files = form.getAll('files') as File[]
  const courseId = String(form.get('courseId') || '')
  const clientId = String(form.get('clientId') || '')
  const mappingsRaw = String(form.get('mappings') || '[]')
  const sendNotification = String(form.get('sendNotification') || 'false') === 'true'
  if (!files.length || !courseId || !clientId) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  let mappings: { fileName: string; employeeId: string; achievedAt?: string; expiresAt?: string }[] = []
  try { mappings = JSON.parse(mappingsRaw) } catch { /* ignore */ }

  const [course, client] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.client.findUnique({ where: { id: clientId } }),
  ])
  if (!course || !client) return NextResponse.json({ error: 'Riferimenti non validi' }, { status: 404 })

  const byName = new Map(mappings.map(m => [m.fileName, m]))
  const uploaded: string[] = []
  const errors: { fileName: string; error: string }[] = []

  // limit concurrency to 5 by batching
  const batchSize = 5
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    await Promise.all(batch.map(async (file) => {
      try {
        if (file.type !== 'application/pdf' || file.size > 10*1024*1024) throw new Error('File non valido')
        const map = byName.get(file.name)
        if (!map?.employeeId) throw new Error('Mapping mancante per file')
        const employee = await prisma.employee.findUnique({ where: { id: map.employeeId } })
        if (!employee || employee.clientId !== clientId) throw new Error('Dipendente non valido')
        const buf = await file.arrayBuffer()
        const key = `certificates/${clientId}/${courseId}/${employee.codiceFiscale}_${Date.now()}.pdf`
        await uploadBuffer(key, Buffer.from(buf), 'application/pdf')
        await prisma.certificate.create({ data: { clientId, courseId, employeeId: employee.id, filePath: key, fileName: file.name, fileSize: file.size, achievedAt: map.achievedAt ? new Date(map.achievedAt) : undefined, expiresAt: map.expiresAt ? new Date(map.expiresAt) : undefined, uploadedById: (session.user as any).id } })
        uploaded.push(file.name)
      } catch (e:any) {
        errors.push({ fileName: file.name, error: e.message || 'Errore' })
      }
    }))
  }

  if (sendNotification && uploaded.length > 0) {
    await prisma.notification.create({ data: { type: 'CERT_UPLOADED', title: `Caricati ${uploaded.length} attestati`, message: `Sono stati caricati ${uploaded.length} attestati per il corso ${course.title}`, courseId, isGlobal: false, targets: { clientIds: [clientId] } as any } })
  }

  await logAudit({ userId: (session.user as any).id, action: 'CERT_BATCH_UPLOAD', entityType: 'Certificate', entityId: courseId, ipAddress: getClientIp(req) || undefined, metadata: { count: uploaded.length, courseId, clientId } })
  return NextResponse.json({ uploaded: uploaded.length, errors })
}
