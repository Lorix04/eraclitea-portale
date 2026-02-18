import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { CLIENT_NOTIFICATION_TYPES_ARRAY } from "@/lib/client-notification-types";

export const dynamic = "force-dynamic";

function clientVisibilityFilter(
  clientId: string,
  userId: string,
  _categoryIds: string[]
): Prisma.NotificationWhereInput {
  return {
    OR: [
      { userId },
      { isGlobal: true },
      { courseEdition: { clientId } },
    ],
  };
}

function adminVisibilityFilter(userId: string): Prisma.NotificationWhereInput {
  return {
    OR: [
      { userId },
      {
        AND: [{ userId: null }, { type: "REGISTRY_RECEIVED" }],
      },
    ],
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  if (isAdminView) {
    const unread = await prisma.notification.count({
      where: adminVisibilityFilter(session.user.id),
    });

      return NextResponse.json({ unread });
  }

  if (!effectiveClient) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const clientId = effectiveClient.clientId;
  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const unread = await prisma.notification.count({
    where: {
      ...clientVisibilityFilter(clientId, effectiveClient.userId, clientCategoryIds),
      type: { in: CLIENT_NOTIFICATION_TYPES_ARRAY },
      reads: { none: { clientId } },
    },
  });

    return NextResponse.json({ unread });
  } catch (error) {
    console.error("[NOTIFICATIONS_COUNT_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
