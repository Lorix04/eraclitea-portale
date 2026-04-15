import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/security";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";
import { shouldSendEmail } from "@/lib/notification-preferences";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !process.env.CRON_API_KEY || !safeCompare(apiKey, process.env.CRON_API_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [
    registriesReceivedYesterday,
    pendingRegistries,
    deadlineToday,
    deadlineExpired,
    startingToday,
    startingThisWeek,
    cvPendingApproval,
    materialsPending,
    certExpiring30d,
    openTickets,
    lockedAccounts,
  ] = await Promise.all([
    prisma.courseRegistration.count({
      where: { status: "CONFIRMED", updatedAt: { gte: yesterday } },
    }),
    prisma.courseEdition.count({
      where: { status: "PUBLISHED", registrations: { some: { status: "INSERTED" } } },
    }),
    prisma.courseEdition.count({
      where: { status: "PUBLISHED", deadlineRegistry: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.courseEdition.count({
      where: { status: "PUBLISHED", deadlineRegistry: { lt: todayStart }, registrations: { some: { status: "INSERTED" } } },
    }),
    prisma.courseEdition.count({
      where: { status: "PUBLISHED", lessons: { some: { date: { gte: todayStart, lte: todayEnd } } } },
    }),
    prisma.courseEdition.count({
      where: { status: "PUBLISHED", lessons: { some: { date: { gte: todayStart, lte: weekFromNow } } } },
    }),
    prisma.teacherCvDpr445.count({ where: { status: "SUBMITTED" } }),
    prisma.editionMaterial.count({ where: { status: "PENDING" } }),
    prisma.certificate.count({ where: { expiresAt: { gte: now, lte: thirtyDaysFromNow } } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
  ]);

  const dateStr = now.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

  const sections = [
    { title: "ANAGRAFICHE", items: [
      `Ricevute ieri: ${registriesReceivedYesterday}`,
      `In attesa di invio: ${pendingRegistries} edizioni`,
      `Deadline oggi: ${deadlineToday}`,
      deadlineExpired > 0 ? `Deadline scadute: ${deadlineExpired}` : null,
    ].filter(Boolean) },
    { title: "CORSI", items: [
      `In partenza oggi: ${startingToday}`,
      `In partenza questa settimana: ${startingThisWeek}`,
    ] },
    { title: "DOCENTI", items: [
      cvPendingApproval > 0 ? `CV DPR 445 da approvare: ${cvPendingApproval}` : null,
      materialsPending > 0 ? `Materiali da approvare: ${materialsPending}` : null,
    ].filter(Boolean) },
    { title: "ATTESTATI", items: [
      `In scadenza nei prossimi 30 giorni: ${certExpiring30d}`,
    ] },
    { title: "TICKET", items: [
      `Aperti: ${openTickets}`,
    ] },
    lockedAccounts > 0 ? { title: "ACCOUNT", items: [`Bloccati: ${lockedAccounts}`] } : null,
  ].filter(Boolean) as Array<{ title: string; items: string[] }>;

  const sectionsHtml = sections
    .filter((s) => s.items.length > 0)
    .map((s) => `
      <p style="margin:16px 0 4px; font-size:13px; font-weight:700; color:#1A1A1A; text-transform:uppercase; letter-spacing:1px;">${s.title}</p>
      ${s.items.map((item) => `<p style="margin:2px 0; font-size:14px; color:#333;">&bull; ${item}</p>`).join("")}
    `)
    .join("");

  const html = buildEmailHtml({
    title: `Riepilogo Giornaliero — ${dateStr}`,
    greeting: "Ciao Admin,",
    bodyHtml: `
      ${emailParagraph("Ecco il riepilogo giornaliero del portale:")}
      ${emailInfoBox(sectionsHtml)}
    `,
    ctaText: "Vai al Pannello Admin",
    ctaUrl: `${PORTAL_URL}/admin`,
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true, name: true },
  });

  let sentCount = 0;
  for (const admin of admins) {
    const canSend = await shouldSendEmail(admin.id, "ADMIN_DAILY_SUMMARY");
    if (!canSend) continue;

    const success = await sendAutoEmail({
      emailType: "ADMIN_DAILY_SUMMARY",
      recipientEmail: admin.email,
      recipientName: admin.name ?? undefined,
      recipientId: admin.id,
      subject: `Riepilogo giornaliero — ${dateStr} — Sapienta`,
      html,
    });
    if (success) sentCount++;
  }

  return NextResponse.json({ success: true, sentCount });
}
