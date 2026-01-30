import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      { course: { visibility: { some: { clientId } } } },
    ],
  };
}

export async function GET() {
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

  const unread = await prisma.notification.count({
    where: {
      ...visibilityFilter(clientId, clientCategoryIds),
      reads: { none: { clientId } },
    },
  });

  return NextResponse.json({ unread });
}
