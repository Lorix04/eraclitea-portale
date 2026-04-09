import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

/**
 * Send an in-app notification to ALL active users of a client.
 * Returns the list of user IDs that were notified.
 */
export async function notifyAllClientUsers(params: {
  clientId: string;
  type: NotificationType;
  title: string;
  message: string;
  courseEditionId?: string;
  ticketId?: string;
  excludeUserId?: string;
}) {
  const clientUsers = await prisma.clientUser.findMany({
    where: { clientId: params.clientId, status: "ACTIVE" },
    select: { userId: true },
  });

  const userIds = clientUsers
    .map((cu) => cu.userId)
    .filter((id) => id !== params.excludeUserId);

  if (userIds.length > 0) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        courseEditionId: params.courseEditionId ?? null,
        ticketId: params.ticketId ?? null,
        isGlobal: false,
      })),
    });
  }

  return userIds;
}

/**
 * Send an email to ALL active users of a client using sendAutoEmail.
 * Respects email preferences via sendAutoEmail.
 */
export async function emailAllClientUsers(params: {
  clientId: string;
  emailType: string;
  subject: string;
  title: string;
  greeting?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  courseEditionId?: string;
  excludeUserId?: string;
}) {
  const clientUsers = await prisma.clientUser.findMany({
    where: { clientId: params.clientId, status: "ACTIVE" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  for (const cu of clientUsers) {
    if (cu.userId === params.excludeUserId) continue;
    const userName = cu.user.name || cu.user.email;

    const html = buildEmailHtml({
      title: params.title,
      greeting: params.greeting ?? `Gentile ${userName},`,
      bodyHtml: params.bodyHtml,
      ctaText: params.ctaText,
      ctaUrl: params.ctaUrl,
    });

    void sendAutoEmail({
      emailType: params.emailType,
      recipientEmail: cu.user.email,
      recipientName: userName,
      recipientId: cu.user.id,
      subject: params.subject,
      html,
      courseEditionId: params.courseEditionId,
    });
  }
}

/**
 * Send notification + email to the client owner only.
 */
export async function notifyClientOwner(params: {
  clientId: string;
  type: NotificationType;
  title: string;
  message: string;
  courseEditionId?: string;
}) {
  const owner = await prisma.clientUser.findFirst({
    where: { clientId: params.clientId, isOwner: true, status: "ACTIVE" },
    select: { userId: true },
  });

  if (owner) {
    await prisma.notification.create({
      data: {
        userId: owner.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        courseEditionId: params.courseEditionId ?? null,
        isGlobal: false,
      },
    });
  }

  return owner?.userId ?? null;
}

// ─── Email template helpers for new notification types ───

export function buildCourseInfoBox(courseName: string, editionNumber: number, extra?: string) {
  return emailInfoBox(`
    <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName} (Ed. #${editionNumber})</p>
    ${extra ?? ""}
  `);
}

export { PORTAL_URL, emailParagraph, emailInfoBox, buildEmailHtml };
