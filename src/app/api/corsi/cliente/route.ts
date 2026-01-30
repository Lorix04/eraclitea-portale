import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";

const TAB_MAP: Record<string, string> = {
  disponibili: "AVAILABLE",
  in_progress: "IN_PROGRESS",
  completati: "COMPLETED",
};

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
      tab: z.enum(["tutti", "disponibili", "in_progress", "completati"]).optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
      all: z.enum(["true", "false"]).optional(),
      categoryId: z.string().cuid().optional(),
    })
  );
  if ("error" in validation) {
    return validation.error;
  }

  const tab = validation.data.tab ?? "disponibili";
  const requestedStatus = tab === "tutti" ? undefined : TAB_MAP[tab];
  const limit = validation.data.limit;
  const includeAll = validation.data.all === "true" || tab === "tutti";
  const categoryId = validation.data.categoryId;

  const clientCategories = await prisma.clientCategory.findMany({
    where: { clientId: session.user.clientId },
    select: { categoryId: true },
  });
  const clientCategoryIds = clientCategories.map((entry) => entry.categoryId);

  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        {
          visibilityType: "ALL",
          visibility: { none: {} },
        },
        {
          visibilityType: "SELECTED_CLIENTS",
          visibility: { some: { clientId: session.user.clientId } },
        },
        {
          visibilityType: "BY_CATEGORY",
          visibilityCategories: {
            some: {
              categoryId: { in: clientCategoryIds.length ? clientCategoryIds : [""] },
            },
          },
        },
        // Compatibilita per corsi creati prima del campo visibilityType
        { visibility: { some: { clientId: session.user.clientId } } },
      ],
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    },
    include: {
      registrations: {
        where: { clientId: session.user.clientId },
        select: { status: true },
      },
      categories: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let data = courses
    .map((course) => {
      const registrationsCount = course.registrations.length;
      const completedCount = course.registrations.filter(
        (reg) => reg.status === "TRAINED"
      ).length;

      let status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" = "AVAILABLE";
      if (registrationsCount > 0 && completedCount === registrationsCount) {
        status = "COMPLETED";
      } else if (registrationsCount > 0) {
        status = "IN_PROGRESS";
      }

      const isNew =
        (Date.now() - course.createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7;

      return {
        id: course.id,
        title: course.title,
        categories: course.categories.map((entry) => ({
          id: entry.category.id,
          name: entry.category.name,
          color: entry.category.color,
        })),
        durationHours: course.durationHours,
        createdAt: course.createdAt,
        dateStart: course.dateStart,
        deadlineRegistry: course.deadlineRegistry,
        status,
        registrationsCount,
        completedCount,
        isNew,
      };
    })
    .filter((course) =>
      includeAll ? true : requestedStatus ? course.status === requestedStatus : true
    );

  if (limit) {
    data = data.slice(0, limit);
  }

  return NextResponse.json({ data });
}
