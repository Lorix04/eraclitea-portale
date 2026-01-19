import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addDays, subDays } from 'date-fns'

const prisma = new PrismaClient()

const admins = [
  { email: 'admin@archeformazione.it', password: 'Admin123!', role: 'ADMIN' },
  { email: 'operatore@archeformazione.it', password: 'Operatore123!', role: 'ADMIN' },
]

const clientsSeed = [
  { ragioneSociale: 'Policlinico Umberto I', piva: '01234567890', indirizzo: 'Viale del Policlinico, 155 - 00161 Roma', referenteNome: 'Yole Monaco', referenteEmail: 'y.monaco@policlinicoumberto1.it', telefono: '06 49971' },
  { ragioneSociale: 'Ospedale San Giovanni Addolorata', piva: '02345678901', indirizzo: 'Via dell\'Amba Aradam, 9 - 00184 Roma', referenteNome: 'Giuseppe Verdi', referenteEmail: 'g.verdi@hsangiovanni.it', telefono: '06 77051' },
  { ragioneSociale: 'ASL Roma 1', piva: '03456789012', indirizzo: 'Via Borgo Santo Spirito, 3 - 00193 Roma', referenteNome: 'Anna Neri', referenteEmail: 'a.neri@aslroma1.it', telefono: '06 68351' },
  { ragioneSociale: 'Fondazione Santa Lucia IRCCS', piva: '04567890123', indirizzo: 'Via Ardeatina, 306 - 00179 Roma', referenteNome: 'Marco Blu', referenteEmail: 'm.blu@hsantalucia.it', telefono: '06 51501' },
  { ragioneSociale: 'Casa di Cura Villa Stuart', piva: '05678901234', indirizzo: 'Via Trionfale, 5952 - 00136 Roma', referenteNome: 'Elena Rosa', referenteEmail: 'e.rosa@villastuart.it', telefono: '06 35528' },
]

const namesM = ['Marco','Giuseppe','Giovanni','Francesco','Antonio','Alessandro','Andrea','Luca','Matteo','Lorenzo']
const namesF = ['Maria','Anna','Giulia','Francesca','Sara','Laura','Chiara','Valentina','Alessia','Martina']
const surnames = ['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Costa','Giordano','Mancini','Rizzo','Lombardi','Moretti']

function cfFrom(n: string, c: string, i: number) {
  // Simple CF-like string compliant with regex, not full checksum
  const monthCode = 'ABCDEHLMPRST'[i % 12]
  const day = (10 + (i % 20)).toString().padStart(2, '0')
  return (c.slice(0,3).padEnd(3,'X') + n.slice(0,3).padEnd(3,'X')).toUpperCase() + '85' + monthCode + day + 'H' + (100 + i).toString().padStart(3,'0') + 'Z'
}

async function main() {
  console.log('🌱 Starting seed...')
  // Clean tables
  await prisma.auditLog.deleteMany()
  await prisma.notificationRead.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.sessionAttendance.deleteMany()
  await prisma.session.deleteMany()
  await prisma.courseAttachment.deleteMany()
  await prisma.certificate.deleteMany()
  await prisma.courseRegistration.deleteMany()
  await prisma.courseVisibility.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()
  await prisma.client.deleteMany()

  // Admins
  for (const a of admins) {
    await prisma.user.create({ data: { email: a.email, passwordHash: await bcrypt.hash(a.password, 10), role: 'ADMIN', isActive: true } })
  }

  // Clients & client users
  const clients = [] as any[]
  for (const c of clientsSeed) {
    const created = await prisma.client.create({ data: c })
    clients.push(created)
    await prisma.user.create({ data: { email: c.referenteEmail, passwordHash: await bcrypt.hash('Cliente123!', 10), role: 'CLIENT', clientId: created.id } })
  }

  // Courses (12)
  const now = new Date()
  const courseDefs = [
    { title: 'CDFB09/315 - Corso lavoratori parte specifica rischio alto (12h)', description: 'Formazione specifica per lavoratori esposti a rischio alto secondo D.Lgs. 81/08', category: 'Sicurezza', dateStart: addDays(now,30), dateEnd: addDays(now,31), deadlineRegistry: addDays(now,20), capacity: 35, location: 'Via Magenta, 12 - 00185 Roma - Hotel Milani', modalita: 'In presenza', status: 'PUBLISHED' },
    { title: 'CDFA06 - Aggiornamento Antincendio Rischio Alto (8h)', description: 'Aggiornamento periodico addetti antincendio rischio elevato', category: 'Antincendio', dateStart: addDays(now,45), dateEnd: addDays(now,45), capacity: 30, location: 'Via del Policlinico, 155 - Ed. 3 - II Chir. 3° piano Castrini', modalita: 'In presenza', status: 'PUBLISHED' },
    { title: 'CDFC04 - Formazione Generale (4h)', description: 'Formazione generale per tutti i lavoratori ai sensi del D.Lgs. 81/08', category: 'Sicurezza', dateStart: addDays(now,15), dateEnd: addDays(now,15), capacity: 35, modalita: 'FAD sincrona', status: 'PUBLISHED' },
    { title: 'CDFB12 - Formazione Preposti (8h)', description: 'Formazione per preposti alla sicurezza', category: 'Sicurezza', dateStart: addDays(now,-5), dateEnd: addDays(now,5), capacity: 25, modalita: 'FAD sincrona', status: 'PUBLISHED' },
    { title: 'CDFA02 - Rischi specifici 8 ore - Personale tecnico amministrativo NO ECM', description: 'Formazione rischi specifici per personale non sanitario', category: 'Sicurezza', dateStart: addDays(now,-30), dateEnd: addDays(now,-30), capacity: 35, status: 'CLOSED' },
    { title: 'CDFM01 - BLSD - Basic Life Support Defibrillation', description: 'Corso certificato per utilizzo defibrillatore', category: 'Emergenze', dateStart: addDays(now,-45), dateEnd: addDays(now,-44), capacity: 20, status: 'CLOSED' },
    { title: 'CDFP03 - Privacy e GDPR per operatori sanitari', description: 'Aggiornamento normativa privacy in ambito sanitario', category: 'Privacy', dateStart: addDays(now,-60), dateEnd: addDays(now,-60), capacity: 50, modalita: 'FAD asincrona', status: 'CLOSED' },
    { title: 'CDFS05 - Movimentazione Manuale dei Carichi', description: 'Tecniche corrette di movimentazione pazienti e carichi', category: 'Sicurezza', dateStart: addDays(now,-90), dateEnd: addDays(now,-89), capacity: 25, status: 'CLOSED' },
    { title: 'CDFA07 - Aggiornamento RLS (8h)', description: 'Aggiornamento annuale RLS', category: 'Sicurezza', status: 'DRAFT' },
    { title: 'CDFS08 - Stress Lavoro Correlato', description: 'Riconoscimento e gestione dello stress lavorativo', category: 'Benessere', status: 'DRAFT' },
    { title: 'CDFC00 - Corso COVID-19 - Protocolli (OBSOLETO)', description: 'Protocolli anti-contagio - corso archiviato', category: 'Emergenze', status: 'ARCHIVED' },
    { title: 'CDFA09 - Antincendio rischio medio (5h)', description: 'Addetti antincendio rischio medio', category: 'Antincendio', dateStart: addDays(now,10), dateEnd: addDays(now,10), capacity: 30, status: 'PUBLISHED' },
  ] as any
  const courses = await Promise.all(courseDefs.map((d:any)=>prisma.course.create({ data: d })))

  // Employees (60)
  const employees = [] as any[]
  for (let i=0;i<60;i++){
    const client = clients[i % clients.length]
    const isM = i % 2 === 0
    const nome = (isM ? namesM : namesF)[i % 10]
    const cognome = surnames[i % surnames.length]
    const cf = cfFrom(nome, cognome, i)
    const emp = await prisma.employee.create({ data: { clientId: client.id, nome, cognome, codiceFiscale: cf, email: `${nome.toLowerCase()}.${cognome.toLowerCase()}@example.com` } })
    employees.push(emp)
  }

  // Registrations (80)
  const regStatuses = ['INSERTED','CONFIRMED','TRAINED'] as const
  let regCount = 0
  for (const emp of employees) {
    const c = courses[(regCount) % courses.length]
    const st = regStatuses[regCount % regStatuses.length]
    await prisma.courseRegistration.create({ data: { clientId: emp.clientId, courseId: c.id, employeeId: emp.id, status: st as any } })
    regCount++
    if (regCount>=80) break
  }

  // Sessions (for courses with dates)
  for (const c of courses.filter(c=>c.dateStart)){
    const s1 = await prisma.session.create({ data: { courseId: c.id, date: c.dateStart!, startTime: '08:00', endTime: '13:00', docente: 'Dott. Verdi', tutor: 'Sig.ra Bianchi', aula: 'Aula 1', modalita: c.modalita || 'In presenza', isCompleted: c.status==='CLOSED' } })
    const s2 = await prisma.session.create({ data: { courseId: c.id, date: c.dateEnd || addDays(c.dateStart!,1), startTime: '14:00', endTime: '18:00', docente: 'Ing. Rossi', tutor: 'Sig. Neri', aula: 'Aula 2', modalita: c.modalita || 'In presenza', isCompleted: c.status==='CLOSED' } })
    if (c.status==='CLOSED'){
      // attendances 80-95%
      const regs = await prisma.courseRegistration.findMany({ where: { courseId: c.id } })
      for (const r of regs){
        const present = (r.id.charCodeAt(0) + r.id.charCodeAt(1)) % 10 > 1 // ~80%
        if (present){
          await prisma.sessionAttendance.create({ data: { sessionId: s1.id, employeeId: r.employeeId, isPresent: true } })
          await prisma.sessionAttendance.create({ data: { sessionId: s2.id, employeeId: r.employeeId, isPresent: true } })
        }
      }
    }
  }

  // Certificates (40)
  let certMade = 0
  for (const c of courses.filter(c=>c.status==='CLOSED')){
    const regs = await prisma.courseRegistration.findMany({ where: { courseId: c.id } })
    for (const r of regs){
      if (certMade>=40) break
      const ach = subDays(now, 20 + (certMade%10))
      const exp = addDays(ach, 365 - (certMade%60))
      const emp = await prisma.employee.findUnique({ where: { id: r.employeeId } })
      const key = `certificates/${r.clientId}/${r.courseId}/${emp!.codiceFiscale}_${Date.now()}.pdf`
      await prisma.certificate.create({ data: { clientId: r.clientId, courseId: r.courseId, employeeId: r.employeeId, filePath: key, fileName: `Attestato_${emp!.cognome}_${emp!.nome}.pdf`, fileSize: 123456, achievedAt: ach, expiresAt: exp, uploadedById: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id } })
      certMade++
    }
  }

  // Course attachments (20)
  let att = 0
  for (const c of courses){
    if (att>=20) break
    await prisma.courseAttachment.create({ data: { courseId: c.id, ambito: 'Edizione', tipo: 'Materiale', fileName: `materiale_${att+1}.pdf`, filePath: `attachments/${c.id}/materiale_${att+1}.pdf`, fileSize: 100000 + att*1000, isInternal: att%3===0 } })
    att++
  }

  // Notifications (15)
  for (let i=0;i<15;i++){
    await prisma.notification.create({ data: { type: (i%3===0?'COURSE_PUBLISHED': i%3===1?'CERT_UPLOADED':'REMINDER') as any, title: `Notifica ${i+1}`, message: 'Messaggio automatico di prova', isGlobal: i%2===0, courseId: i%2===0? null : courses[i%courses.length].id } })
  }

  // Some reads
  const nAll = await prisma.notification.findMany()
  for (const n of nAll.slice(0,7)){
    await prisma.notificationRead.create({ data: { notificationId: n.id, clientId: clients[0].id } })
  }

  // Audit logs (50)
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  for (let i=0;i<50;i++){
    await prisma.auditLog.create({ data: { userId: admin!.id, action: ['LOGIN','CSV_EXPORT','CERT_UPLOAD','COURSE_CREATE','COURSE_UPDATE'][i%5], entityType: ['Course','Client','Certificate'][i%3], entityId: courses[i%courses.length].id, createdAt: subDays(now, i%30) } as any })
  }

  console.log('✅ Seed completed successfully!')
  console.log('\n📋 TEST CREDENTIALS:')
  console.log('Admin: admin@archeformazione.it / Admin123!')
  console.log('Operatore: operatore@archeformazione.it / Operatore123!')
  console.log('Cliente Policlinico: y.monaco@policlinicoumberto1.it / Cliente123!')
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())
