import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/security";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (
    !apiKey ||
    !process.env.CRON_API_KEY ||
    !safeCompare(apiKey, process.env.CRON_API_KEY)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find all active clients
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, ragioneSociale: true },
  });

  let sentCount = 0;

  for (const client of clients) {
    // Gather stats for this client
    const [activeEditions, upcomingDeadlines, pendingRegistrations, newCertificates, openTickets] =
      await Promise.all([
        prisma.courseEdition.count({
          where: {
            clientId: client.id,
            status: "PUBLISHED",
          },
        }),
        prisma.courseEdition.count({
          where: {
            clientId: client.id,
            status: "PUBLISHED",
            deadlineRegistry: { gte: now, lte: oneWeekFromNow },
          },
        }),
        prisma.courseEdition.count({
          where: {
            clientId: client.id,
            status: "PUBLISHED",
            registrations: { some: { status: "INSERTED" } },
          },
        }),
        prisma.certificate.count({
          where: {
            clientId: client.id,
            uploadedAt: { gte: oneWeekAgo },
          },
        }),
        prisma.ticket.count({
          where: {
            clientId: {
              in: (
                await prisma.clientUser.findMany({
                  where: { clientId: client.id, status: "ACTIVE" },
                  select: { userId: true },
                })
              ).map((cu) => cu.userId),
            },
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        }),
      ]);

    // Skip if nothing to report
    if (
      activeEditions === 0 &&
      upcomingDeadlines === 0 &&
      pendingRegistrations === 0 &&
      newCertificates === 0 &&
      openTickets === 0
    ) {
      continue;
    }

    const statsHtml = [
      `<p style="margin:4px 0; font-size:14px; color:#1A1A1A;">&#128218; <strong>Corsi attivi:</strong> ${activeEditions} edizioni in corso</p>`,
      upcomingDeadlines > 0
        ? `<p style="margin:4px 0; font-size:14px; color:#CC0000;">&#9888;&#65039; <strong>Deadline imminenti:</strong> ${upcomingDeadlines} edizioni con deadline questa settimana</p>`
        : null,
      pendingRegistrations > 0
        ? `<p style="margin:4px 0; font-size:14px; color:#1A1A1A;">&#128203; <strong>Anagrafiche da inviare:</strong> ${pendingRegistrations} edizioni in attesa</p>`
        : null,
      newCertificates > 0
        ? `<p style="margin:4px 0; font-size:14px; color:#1A1A1A;">&#127942; <strong>Nuovi attestati:</strong> ${newCertificates} disponibili per il download</p>`
        : null,
      openTickets > 0
        ? `<p style="margin:4px 0; font-size:14px; color:#1A1A1A;">&#128172; <strong>Ticket aperti:</strong> ${openTickets}</p>`
        : null,
    ]
      .filter(Boolean)
      .join("");

    // Get all active client users
    const clientUsers = await prisma.clientUser.findMany({
      where: { clientId: client.id, status: "ACTIVE" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    for (const cu of clientUsers) {
      const userName = cu.user.name || cu.user.email;
      const html = buildEmailHtml({
        title: "Riepilogo Settimanale",
        greeting: `Gentile ${userName},`,
        bodyHtml: `
          ${emailParagraph(`Ecco il riepilogo settimanale per <strong>${client.ragioneSociale}</strong>:`)}
          ${emailInfoBox(statsHtml)}
          ${emailParagraph("Accedi al portale per i dettagli.")}
        `,
        ctaText: "Vai al Portale",
        ctaUrl: PORTAL_URL,
      });

      const success = await sendAutoEmail({
        emailType: "WEEKLY_SUMMARY",
        recipientEmail: cu.user.email,
        recipientName: userName,
        recipientId: cu.user.id,
        subject: `Riepilogo settimanale - ${client.ragioneSociale} - Sapienta`,
        html,
      });

      if (success) sentCount += 1;
    }
  }

  return NextResponse.json({ success: true, sentCount });
}
