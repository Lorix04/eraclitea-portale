import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { CLIENT_NOTIFICATION_TYPES_ARRAY } from "@/lib/client-notification-types";

function visibilityFilter(
  clientId: string,
  userId: string,
  _categoryIds: string[]
): Prisma.NotificationWhereInput {
  return {
    OR: [
      { userId },
      { isGlobal: true },
      // Solo notifiche "di cliente" senza destinatario (userId null). Le per-utente
      // le marca lette solo il destinatario via { userId }; il vincolo userId:null evita
      // di agire sulle righe degli altri utenti dello stesso cliente.
      { userId: null, courseEdition: { clientId } },
    ],
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  if (isAdminView) {
    return NextResponse.json({ ok: true });
  }

  if (!effectiveClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = effectiveClient.clientId;
  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const notifications = await prisma.notification.findMany({
    where: {
      ...visibilityFilter(clientId, effectiveClient.userId, clientCategoryIds),
      type: { in: CLIENT_NOTIFICATION_TYPES_ARRAY },
    },
    select: { id: true },
  });

  if (!notifications.length) {
    return NextResponse.json({ ok: true });
  }

  await prisma.notificationRead.createMany({
    data: notifications.map((notification) => ({
      notificationId: notification.id,
      clientId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true });
}
