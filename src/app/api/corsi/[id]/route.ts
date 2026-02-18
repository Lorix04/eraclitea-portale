import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { courseUpdateSchema } from "@/lib/schemas";
import { getClientIP, logAudit } from "@/lib/audit";
import { deleteCertificateFile } from "@/lib/certificate-storage";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    include: {
      visibility: {
        include: {
          client: { select: { id: true, ragioneSociale: true } },
        },
      },
      visibilityCategories: { include: { category: true } },
      categories: { include: { category: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: course });
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = await validateBody(request, courseUpdateSchema);
  if ("error" in validation) {
    return validation.error;
  }

  const data = validation.data;
  const visibilityClientIds: string[] | undefined = data.visibilityClientIds;
  const visibilityCategoryIds: string[] | undefined = data.visibilityCategoryIds;
  const categoryIds: string[] | undefined = data.categoryIds;

  const course = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.durationHours !== undefined) updateData.durationHours = data.durationHours ?? null;
    if (data.visibilityType !== undefined)
      updateData.visibilityType = data.visibilityType;

    const updated = await tx.course.update({
      where: { id: context.params.id },
      data: updateData,
    });

    if (visibilityClientIds !== undefined) {
      await tx.courseVisibility.deleteMany({
        where: { courseId: context.params.id },
      });

      if (
        data.visibilityType === "SELECTED_CLIENTS" &&
        visibilityClientIds.length
      ) {
        await tx.courseVisibility.createMany({
          data: visibilityClientIds.map((clientId) => ({
            courseId: context.params.id,
            clientId,
          })),
        });
      }
    }

    if (visibilityCategoryIds !== undefined) {
      await tx.courseVisibilityCategory.deleteMany({
        where: { courseId: context.params.id },
      });

      if (
        data.visibilityType === "BY_CATEGORY" &&
        visibilityCategoryIds.length
      ) {
        await tx.courseVisibilityCategory.createMany({
          data: visibilityCategoryIds.map((categoryId) => ({
            courseId: context.params.id,
            categoryId,
          })),
        });
      }
    }

    if (categoryIds !== undefined) {
      await tx.courseCategory.deleteMany({
        where: { courseId: context.params.id },
      });
      if (categoryIds.length) {
        await tx.courseCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            courseId: context.params.id,
            categoryId,
          })),
        });
      }
    }

    return updated;
  });

  await logAudit({
    userId: session.user.id,
    action: "COURSE_UPDATE",
    entityType: "Course",
    entityId: course.id,
    ipAddress: getClientIP(request),
  });

  const courseWithCategories = await prisma.course.findUnique({
    where: { id: context.params.id },
    include: {
      visibility: {
        include: {
          client: { select: { id: true, ragioneSociale: true } },
        },
      },
      visibilityCategories: { include: { category: true } },
      categories: { include: { category: true } },
    },
  });

  return NextResponse.json({ data: courseWithCategories ?? course });
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({
    where: { id: context.params.id },
    include: {
      _count: {
        select: {
          editions: true,
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const certificates = await prisma.certificate.findMany({
    where: {
      courseEdition: { courseId: context.params.id },
    },
    select: { filePath: true },
  });

  for (const certificate of certificates) {
    if (!certificate.filePath) continue;
    try {
      await deleteCertificateFile(certificate.filePath);
    } catch (error) {
      console.warn("Impossibile eliminare file attestato:", certificate.filePath, error);
    }
  }

  await prisma.course.delete({
    where: { id: course.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "COURSE_DELETE",
    entityType: "Course",
    entityId: course.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json({
    success: true,
    message: "Corso eliminato con successo",
  });
}
