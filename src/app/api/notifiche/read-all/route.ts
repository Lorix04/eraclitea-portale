import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const CLIENT_NOTIFICATION_TYPES = ["COURSE_PUBLISHED", "CERT_UPLOADED"] as const;
const CLIENT_NOTIFICATION_TYPES_ARRAY = [...CLIENT_NOTIFICATION_TYPES];

function visibilityFilter(
  clientId: string,
  _categoryIds: string[]
): Prisma.NotificationWhereInput {
  return {
    OR: [
      { isGlobal: true },
      { courseEdition: { clientId } },
    ],
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const clientId = session.user.clientId;
  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const notifications = await prisma.notification.findMany({
    where: {
      ...visibilityFilter(clientId, clientCategoryIds),
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
