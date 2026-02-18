import { NextResponse } from "next/server";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getEffectiveClientContext();
    if (!context) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

  const clientId = context.clientId;
  const userId = context.userId;

  const [
    client,
    activeCourses,
    employees,
    certificates,
    openTickets,
    upcomingEditionsRaw,
    recentNotificationsRaw,
  ] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { ragioneSociale: true },
    }),
    prisma.courseEdition.count({
      where: { clientId, status: "PUBLISHED" },
    }),
    prisma.employee.count({
      where: { clientId },
    }),
    prisma.certificate.count({
      where: { clientId },
    }),
    prisma.ticket.count({
      where: {
        clientId: userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    }),
    prisma.courseEdition.findMany({
      where: { clientId, status: "PUBLISHED" },
      include: {
        course: { select: { title: true } },
        registrations: { select: { status: true } },
      },
      orderBy: [{ deadlineRegistry: "asc" }, { startDate: "asc" }],
      take: 5,
    }),
    prisma.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { isGlobal: true },
              { courseEdition: { clientId } },
            ],
          },
          { reads: { none: { clientId } } },
        ],
      },
      include: {
        courseEdition: {
          select: {
            id: true,
            editionNumber: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const upcomingEditions = upcomingEditionsRaw.map((edition) => {
    const registrySent = edition.registrations.some(
      (registration) =>
        registration.status === "CONFIRMED" || registration.status === "TRAINED"
    );

    return {
      id: edition.id,
      courseTitle: edition.course.title,
      startDate: edition.startDate,
      endDate: edition.endDate,
      deadlineRegistry: edition.deadlineRegistry,
      registrationCount: edition.registrations.length,
      registryStatus: registrySent ? "SENT" : "PENDING",
    };
  });

  const recentNotifications = recentNotificationsRaw.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
    courseEditionId: notification.courseEditionId,
    ticketId: notification.ticketId,
    courseTitle: notification.courseEdition?.course?.title ?? null,
    editionNumber: notification.courseEdition?.editionNumber ?? null,
  }));

    return NextResponse.json({
      clientName:
        client?.ragioneSociale ??
        context.impersonatedClientName ??
        context.session.user.email,
      stats: { activeCourses, employees, certificates, openTickets },
      upcomingEditions,
      recentNotifications,
    });
  } catch (error) {
    console.error("[CLIENT_DASHBOARD_STATS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
