import { prisma } from "@/lib/prisma";

export async function isClientOwner(
  userId: string,
  clientId: string
): Promise<boolean> {
  const cu = await prisma.clientUser.findUnique({
    where: { clientId_userId: { clientId, userId } },
    select: { isOwner: true },
  });
  return cu?.isOwner === true;
}

export async function countClientUsers(clientId: string): Promise<number> {
  return prisma.clientUser.count({
    where: { clientId },
  });
}

export async function countActiveClientUsers(clientId: string): Promise<number> {
  return prisma.clientUser.count({
    where: { clientId, status: "ACTIVE" },
  });
}

export async function canAddUser(
  clientId: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { maxUsers: true },
  });
  const current = await countClientUsers(clientId);
  const max = client?.maxUsers ?? null;
  return {
    allowed: max === null || current < max,
    current,
    max,
  };
}

export async function logClientActivity(params: {
  clientId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.clientActivityLog.create({ data: params });
  } catch (error) {
    console.error("[CLIENT_ACTIVITY_LOG] Error:", error);
  }
}
