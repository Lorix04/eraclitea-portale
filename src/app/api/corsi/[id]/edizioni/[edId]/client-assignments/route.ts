import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET — list the client users assigned to this edition
export async function GET(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: { id: true, courseId: true },
  });
  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  const assignments = await prisma.editionClientAssignment.findMany({
    where: { courseEditionId: context.params.edId },
    select: { userId: true },
  });

  return NextResponse.json({
    assignedUserIds: assignments.map((a) => a.userId),
  });
}

// PUT — replace the set of assigned client users (admin only)
export async function PUT(
  request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "edizioni", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    select: { id: true, courseId: true, clientId: true },
  });
  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  let body: { userIds?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const requestedIds = Array.isArray(body.userIds)
    ? Array.from(new Set(body.userIds.filter((id) => typeof id === "string")))
    : [];

  // Keep only users that actually belong (active) to this edition's client
  let validIds: string[] = [];
  if (requestedIds.length > 0) {
    const validUsers = await prisma.clientUser.findMany({
      where: {
        clientId: edition.clientId,
        status: "ACTIVE",
        userId: { in: requestedIds },
      },
      select: { userId: true },
    });
    validIds = validUsers.map((u) => u.userId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.editionClientAssignment.deleteMany({
      where: { courseEditionId: context.params.edId },
    });
    if (validIds.length > 0) {
      await tx.editionClientAssignment.createMany({
        data: validIds.map((userId) => ({
          courseEditionId: context.params.edId,
          userId,
          assignedById: session.user.id,
        })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({ success: true, assignedUserIds: validIds });
}
