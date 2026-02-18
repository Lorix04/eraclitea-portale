import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { NotificationType, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import {
  CLIENT_NOTIFICATION_TYPES,
  CLIENT_NOTIFICATION_TYPES_ARRAY,
} from "@/lib/client-notification-types";

export const dynamic = "force-dynamic";

const ADMIN_NOTIFICATION_TYPES = [
  "REGISTRY_RECEIVED",
  "TICKET_OPENED",
  "TICKET_NEW_MESSAGE",
  "TICKET_REPLY",
  "TICKET_STATUS_CHANGED",
] as const;

type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

function isAdminNotificationType(value: string): value is AdminNotificationType {
  return (ADMIN_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const effectiveClient = await getEffectiveClientContext();
    const isAdminView =
      session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  if (isAdminView) {
    const validation = validateQuery(
      request,
      z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(50).default(20),
        type: z.string().optional(),
      })
    );
    if ("error" in validation) {
      return validation.error;
    }

    const { page, limit, type } = validation.data;
    const safePage = page ?? 1;
    const safeLimit = limit ?? 20;
    const skip = (safePage - 1) * safeLimit;

    if (type && !isAdminNotificationType(type)) {
      return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
    }

    const selectedAdminTypes: NotificationType[] = type
      ? [type as NotificationType]
      : [...ADMIN_NOTIFICATION_TYPES] as NotificationType[];

    const baseWhere: Prisma.NotificationWhereInput = {
      AND: [
        adminVisibilityFilter(session.user.id),
        {
          type: {
            in: selectedAdminTypes,
          },
        },
      ],
    };

    const [notifications, totalCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: baseWhere,
        include: {
          courseEdition: {
            select: {
              id: true,
              editionNumber: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.notification.count({ where: baseWhere }),
    ]);

    const items = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message ?? undefined,
      courseEditionId: notification.courseEditionId ?? undefined,
      courseTitle: notification.courseEdition?.course?.title,
      editionNumber: notification.courseEdition?.editionNumber,
      ticketId: notification.ticketId ?? undefined,
      createdAt: notification.createdAt,
      isRead: false,
    }));

      return NextResponse.json({
        items,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
        page: safePage,
        unreadCount: totalCount,
      });
  }

  if (!effectiveClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateQuery(
    request,
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(50).default(20),
      unreadOnly: z.coerce.boolean().optional(),
      type: z.enum(CLIENT_NOTIFICATION_TYPES).optional(),
    })
  );
  if ("error" in validation) {
    return validation.error;
  }

  const { page, limit, unreadOnly, type } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const clientId = effectiveClient.clientId;
  const skip = (safePage - 1) * safeLimit;

  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const baseWhere: Prisma.NotificationWhereInput = {
    ...clientVisibilityFilter(clientId, effectiveClient.userId, clientCategoryIds),
    type: { in: CLIENT_NOTIFICATION_TYPES_ARRAY },
  };

  if (type) {
    baseWhere.type = type;
  }

  const listWhere: Prisma.NotificationWhereInput = { ...baseWhere };
  if (unreadOnly) {
    listWhere.reads = { none: { clientId } };
  }

  const [notifications, totalCount, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: listWhere,
      include: {
        reads: { where: { clientId } },
        courseEdition: {
          select: {
            id: true,
            editionNumber: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.notification.count({ where: listWhere }),
    prisma.notification.count({
      where: {
        ...baseWhere,
        reads: { none: { clientId } },
      },
    }),
  ]);

  const items = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message ?? undefined,
    courseEditionId: notification.courseEditionId ?? undefined,
    courseTitle: notification.courseEdition?.course?.title,
    editionNumber: notification.courseEdition?.editionNumber,
    ticketId: notification.ticketId ?? undefined,
    createdAt: notification.createdAt,
    isRead: notification.reads.length > 0,
  }));

    return NextResponse.json({
      items,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
      page: safePage,
      unreadCount,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
