import { prisma } from "@/lib/prisma";
import { NOTIFICATION_TYPES } from "@/lib/notification-types-config";

/**
 * Check if an in-app notification should be sent to a specific user.
 * Respects user preferences; locked types always return true.
 */
export async function shouldSendInApp(
  userId: string,
  type: string
): Promise<boolean> {
  const config = NOTIFICATION_TYPES.find((t) => t.type === type);
  if (!config) return true; // Unknown type → send by default
  if (config.locked) return true;
  if (!config.hasInApp) return false;

  const pref = await prisma.userNotificationPreference.findUnique({
    where: { userId_notificationType: { userId, notificationType: type } },
    select: { inAppEnabled: true },
  });

  return pref?.inAppEnabled ?? config.defaultInApp;
}

/**
 * Check if an email notification should be sent to a specific user.
 * Respects user preferences; locked types always return true.
 */
export async function shouldSendEmail(
  userId: string,
  type: string
): Promise<boolean> {
  const config = NOTIFICATION_TYPES.find((t) => t.type === type);
  if (!config) return true;
  if (config.locked) return true;
  if (!config.hasEmail) return false;

  const pref = await prisma.userNotificationPreference.findUnique({
    where: { userId_notificationType: { userId, notificationType: type } },
    select: { emailEnabled: true },
  });

  return pref?.emailEnabled ?? config.defaultEmail;
}

/**
 * Filter a list of userIds to only those who have in-app enabled for this type.
 */
export async function filterUsersForInApp(
  userIds: string[],
  type: string
): Promise<string[]> {
  const config = NOTIFICATION_TYPES.find((t) => t.type === type);
  if (!config) return userIds;
  if (config.locked) return userIds;
  if (!config.hasInApp) return [];

  if (userIds.length === 0) return [];

  const prefs = await prisma.userNotificationPreference.findMany({
    where: {
      userId: { in: userIds },
      notificationType: type,
    },
    select: { userId: true, inAppEnabled: true },
  });

  const prefMap = new Map(prefs.map((p) => [p.userId, p.inAppEnabled]));

  return userIds.filter((id) => {
    const enabled = prefMap.get(id);
    return enabled ?? config.defaultInApp;
  });
}

/**
 * Filter a list of userIds to only those who have email enabled for this type.
 */
export async function filterUsersForEmail(
  userIds: string[],
  type: string
): Promise<string[]> {
  const config = NOTIFICATION_TYPES.find((t) => t.type === type);
  if (!config) return userIds;
  if (config.locked) return userIds;
  if (!config.hasEmail) return [];

  if (userIds.length === 0) return [];

  const prefs = await prisma.userNotificationPreference.findMany({
    where: {
      userId: { in: userIds },
      notificationType: type,
    },
    select: { userId: true, emailEnabled: true },
  });

  const prefMap = new Map(prefs.map((p) => [p.userId, p.emailEnabled]));

  return userIds.filter((id) => {
    const enabled = prefMap.get(id);
    return enabled ?? config.defaultEmail;
  });
}
