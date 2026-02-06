import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

function visibilityFilter(
  clientId: string,
  categoryIds: string[]
): Prisma.NotificationWhereInput {
  return {
    OR: [
      { isGlobal: true },
      { course: { visibilityType: "ALL", visibility: { none: {} } } },
      {
        course: {
          visibilityType: "SELECTED_CLIENTS",
          visibility: { some: { clientId } },
        },
      },
      {
        course: {
          visibilityType: "BY_CATEGORY",
          visibilityCategories: {
            some: {
              categoryId: { in: categoryIds.length ? categoryIds : [""] },
            },
          },
        },
      },
      // Compatibilita per corsi creati prima del campo visibilityType
      { course: { visibility: { some: { clientId } } } },
    ],
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.clientId) {
    return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
  }

  const validation = validateQuery(
    request,
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(50).default(20),
      unreadOnly: z.coerce.boolean().optional(),
      type: z
        .enum(["COURSE_PUBLISHED", "CERT_UPLOADED", "REMINDER", "ATTENDANCE_RECORDED"])
        .optional(),
    })
  );
  if ("error" in validation) {
    return validation.error;
  }

  const { page, limit, unreadOnly, type } = validation.data;
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  const clientId = session.user.clientId;
  const skip = (safePage - 1) * safeLimit;

  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const baseWhere: Prisma.NotificationWhereInput = {
    ...visibilityFilter(clientId, clientCategoryIds),
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
        course: { select: { id: true, title: true } },
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
    courseId: notification.courseId ?? undefined,
    courseTitle: notification.course?.title,
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
}
