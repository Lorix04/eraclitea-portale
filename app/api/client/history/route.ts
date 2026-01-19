import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const clientId = (session?.user as any)?.clientId as string | undefined
  if (!session || !clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const completed = await prisma.course.findMany({ where: { status: { in: ['CLOSED','ARCHIVED'] }, registrations: { some: { clientId } } }, orderBy: { dateEnd: 'desc' } })
  const courses = await Promise.all(completed.map(async c => {
    const employeesRegistered = await prisma.courseRegistration.count({ where: { courseId: c.id, clientId } })
    const employeesTrained = await prisma.sessionAttendance.count({ where: { session: { courseId: c.id }, isPresent: true, employee: { clientId } } })
    const certificatesIssued = await prisma.certificate.count({ where: { courseId: c.id, clientId } })
    const attendanceRate = employeesRegistered ? Math.round((employeesTrained / employeesRegistered) * 100) : 0
    return { id: c.id, title: c.title, category: c.category, dateStart: c.dateStart, dateEnd: c.dateEnd, status: c.status, clientStats: { employeesRegistered, employeesTrained, certificatesIssued, attendanceRate } }
  }))

  const summary = {
    totalCourses: courses.length,
    totalEmployeesTrained: courses.reduce((a,c)=>a+c.clientStats.employeesTrained,0),
    totalCertificates: courses.reduce((a,c)=>a+c.clientStats.certificatesIssued,0),
    averageAttendance: courses.length? Math.round(courses.reduce((a,c)=>a+c.clientStats.attendanceRate,0)/courses.length) : 0,
  }

  return NextResponse.json({ courses, summary })
}
