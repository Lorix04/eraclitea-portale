import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import { coursePublishedTemplate } from "@/lib/email-templates";
import { getClientIP, logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const course = await tx.course.update({
      where: { id: context.params.id },
      data: { status: "PUBLISHED" },
      include: { visibility: true, visibilityCategories: true },
    });

    const isGlobal =
      course.visibilityType === "ALL" &&
      course.visibility.length === 0 &&
      course.visibilityCategories.length === 0;

    await tx.notification.create({
      data: {
        type: "COURSE_PUBLISHED",
        title: `Nuovo corso: ${course.title}`,
        message: course.description ?? null,
        courseId: course.id,
        isGlobal,
      },
    });

    return course;
  });

  let recipients = [];
  if (result.visibilityType === "SELECTED_CLIENTS") {
    const clientIds = result.visibility.map((entry) => entry.clientId);
    recipients = clientIds.length
      ? await prisma.client.findMany({ where: { id: { in: clientIds } } })
      : [];
  } else if (result.visibilityType === "BY_CATEGORY") {
    const categoryIds = result.visibilityCategories.map((entry) => entry.categoryId);
    recipients = categoryIds.length
      ? await prisma.client.findMany({
          where: {
            isActive: true,
            categories: { some: { categoryId: { in: categoryIds } } },
          },
        })
      : [];
  } else {
    recipients = await prisma.client.findMany({ where: { isActive: true } });
  }

  await Promise.all(
    recipients.map((client) =>
      send({
        to: client.referenteEmail,
        subject: `Nuovo corso: ${result.title}`,
        html: coursePublishedTemplate(result.title, result.deadlineRegistry),
      })
    )
  );

  await logAudit({
    userId: session.user.id,
    action: "COURSE_PUBLISH",
    entityType: "Course",
    entityId: result.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({ data: result });
}
