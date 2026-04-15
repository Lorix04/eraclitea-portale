import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailInfoBox, emailParagraph } from "@/lib/email-templates";
import { filterUsersForInApp, filterUsersForEmail } from "@/lib/notification-preferences";

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

  const allUserIds = clientUsers
    .map((cu) => cu.userId)
    .filter((id) => id !== params.excludeUserId);

  // Filter by user preferences
  const userIds = await filterUsersForInApp(allUserIds, params.type);

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

  // Filter by user email preferences
  const eligibleUserIds = await filterUsersForEmail(
    clientUsers.filter((cu) => cu.userId !== params.excludeUserId).map((cu) => cu.userId),
    params.emailType
  );
  const eligibleSet = new Set(eligibleUserIds);

  for (const cu of clientUsers) {
    if (!eligibleSet.has(cu.userId)) continue;
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

// ─── Edition-aware notification (respects notifyPolicy) ───

/**
 * Send in-app notification respecting the edition's notifyPolicy.
 * Falls back to notifyAllClientUsers if edition not found or no referents.
 */
export async function notifyEditionUsers(params: {
  editionId: string;
  clientId: string;
  type: NotificationType;
  title: string;
  message: string;
  courseEditionId?: string;
  excludeUserId?: string;
}) {
  const edition = await prisma.courseEdition.findUnique({
    where: { id: params.editionId },
    select: {
      notifyPolicy: true,
      notifyExtraUserIds: true,
      referents: { select: { userId: true } },
    },
  });

  if (!edition || edition.notifyPolicy === "ALL") {
    return notifyAllClientUsers({
      ...params,
      courseEditionId: params.courseEditionId ?? params.editionId,
    });
  }

  let targetUserIds: string[] = [];

  if (edition.notifyPolicy === "REFERENT_ONLY") {
    targetUserIds = edition.referents.map((r) => r.userId);
  } else if (edition.notifyPolicy === "REFERENT_PLUS") {
    targetUserIds = [
      ...edition.referents.map((r) => r.userId),
      ...edition.notifyExtraUserIds,
    ];
  }

  targetUserIds = [...new Set(targetUserIds)].filter(
    (id) => id !== params.excludeUserId
  );

  // Fallback: if no referents found, notify all
  if (targetUserIds.length === 0) {
    return notifyAllClientUsers({
      ...params,
      courseEditionId: params.courseEditionId ?? params.editionId,
    });
  }

  await prisma.notification.createMany({
    data: targetUserIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      courseEditionId: params.courseEditionId ?? params.editionId,
      isGlobal: false,
    })),
  });

  return targetUserIds;
}

/**
 * Send email respecting the edition's notifyPolicy.
 * Falls back to emailAllClientUsers if policy is ALL or no referents.
 */
export async function emailEditionUsers(params: {
  editionId: string;
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
  const edition = await prisma.courseEdition.findUnique({
    where: { id: params.editionId },
    select: {
      notifyPolicy: true,
      notifyExtraUserIds: true,
      referents: {
        select: {
          userId: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!edition || edition.notifyPolicy === "ALL") {
    return emailAllClientUsers({
      ...params,
      courseEditionId: params.courseEditionId ?? params.editionId,
    });
  }

  let targetUsers: Array<{ id: string; email: string; name: string | null }> =
    [];

  if (
    edition.notifyPolicy === "REFERENT_ONLY" ||
    edition.notifyPolicy === "REFERENT_PLUS"
  ) {
    targetUsers = edition.referents.map((r) => ({
      id: r.user.id,
      email: r.user.email,
      name: r.user.name,
    }));
  }

  if (edition.notifyPolicy === "REFERENT_PLUS" && edition.notifyExtraUserIds.length > 0) {
    const extraUsers = await prisma.user.findMany({
      where: { id: { in: edition.notifyExtraUserIds } },
      select: { id: true, email: true, name: true },
    });
    targetUsers.push(...extraUsers);
  }

  // Deduplicate by userId
  const seen = new Set<string>();
  targetUsers = targetUsers.filter((u) => {
    if (seen.has(u.id) || u.id === params.excludeUserId) return false;
    seen.add(u.id);
    return true;
  });

  // Fallback: if no targets, email all
  if (targetUsers.length === 0) {
    return emailAllClientUsers({
      ...params,
      courseEditionId: params.courseEditionId ?? params.editionId,
    });
  }

  const ceId = params.courseEditionId ?? params.editionId;
  for (const user of targetUsers) {
    const userName = user.name || user.email;
    const html = buildEmailHtml({
      title: params.title,
      greeting: params.greeting ?? `Gentile ${userName},`,
      bodyHtml: params.bodyHtml,
      ctaText: params.ctaText,
      ctaUrl: params.ctaUrl,
    });

    void sendAutoEmail({
      emailType: params.emailType,
      recipientEmail: user.email,
      recipientName: userName,
      recipientId: user.id,
      subject: params.subject,
      html,
      courseEditionId: ceId,
    });
  }
}

// ─── Email template helpers for new notification types ───

export function buildCourseInfoBox(courseName: string, editionNumber: number, extra?: string) {
  return emailInfoBox(`
    <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Corso:</strong> ${courseName} (Ed. #${editionNumber})</p>
    ${extra ?? ""}
  `);
}

export { PORTAL_URL, emailParagraph, emailInfoBox, buildEmailHtml };
