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

  const editions = await prisma.courseEdition.findMany({
    where: {
      clientId: session.user.clientId,
      ...(categoryId
        ? { course: { categories: { some: { categoryId } } } }
        : {}),
    },
    include: {
      course: {
        include: {
          categories: { include: { category: true } },
        },
      },
      registrations: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let data = editions
    .map((edition) => {
      const registrationsCount = edition.registrations.length;
      const completedCount = edition.registrations.filter(
        (reg) => reg.status === "TRAINED"
      ).length;

      let status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" = "AVAILABLE";
      if (registrationsCount > 0 && completedCount === registrationsCount) {
        status = "COMPLETED";
      } else if (registrationsCount > 0) {
        status = "IN_PROGRESS";
      }

      const isNew =
        (Date.now() - edition.createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7;

      return {
        id: edition.id,
        courseId: edition.courseId,
        editionNumber: edition.editionNumber,
        startDate: edition.startDate,
        endDate: edition.endDate,
        deadlineRegistry: edition.deadlineRegistry,
        status,
        registrationsCount,
        completedCount,
        isNew,
        course: {
          id: edition.course.id,
          title: edition.course.title,
          durationHours: edition.course.durationHours,
          categories: edition.course.categories.map((entry) => ({
            id: entry.category.id,
            name: entry.category.name,
            color: entry.category.color,
          })),
        },
      };
    })
    .filter((edition) =>
      includeAll
        ? true
        : requestedStatus
          ? edition.status === requestedStatus
          : true
    );

  if (limit) {
    data = data.slice(0, limit);
  }

  const grouped = new Map<
    string,
    {
      id: string;
      title: string;
      durationHours?: number | null;
      categories: { id: string; name: string; color?: string | null }[];
      editions: typeof data;
    }
  >();

  data.forEach((edition) => {
    const existing = grouped.get(edition.courseId);
    if (existing) {
      existing.editions.push(edition);
      return;
    }
    grouped.set(edition.courseId, {
      id: edition.course.id,
      title: edition.course.title,
      durationHours: edition.course.durationHours ?? null,
      categories: edition.course.categories,
      editions: [edition],
    });
  });

  return NextResponse.json({ data: Array.from(grouped.values()) });
}
