import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string; edId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const referents = await prisma.editionReferent.findMany({
    where: { courseEditionId: context.params.edId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          adminRole: { select: { name: true } },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json({
    referents: referents.map((r) => ({
      id: r.id,
      userId: r.user.id,
      userEmail: r.user.email,
      roleName: r.user.adminRole?.name ?? null,
      assignedAt: r.assignedAt,
      notes: r.notes,
    })),
  });
}

export async function POST(
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

  const body = await request.json();
  const { userIds, notes } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "Specifica almeno un utente" },
      { status: 400 }
    );
  }

  const edition = await prisma.courseEdition.findUnique({
    where: { id: context.params.edId },
    include: {
      course: { select: { title: true } },
      client: { select: { ragioneSociale: true } },
    },
  });

  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  // Verify all userIds are ADMIN users
  const adminUsers = await prisma.user.findMany({
    where: { id: { in: userIds }, role: "ADMIN" },
    select: { id: true },
  });
  const validIds = new Set(adminUsers.map((u) => u.id));

  let created = 0;
  for (const userId of userIds) {
    if (!validIds.has(userId)) continue;
    try {
      await prisma.editionReferent.create({
        data: {
          courseEditionId: context.params.edId,
          userId,
          assignedById: session.user.id,
          notes: notes?.trim() || null,
        },
      });
      created++;

      // Notify the new referent
      try {
        await prisma.notification.create({
          data: {
            userId,
            type: "EDITION_DATES_CHANGED" as any, // reuse existing type
            title: "Assegnato come referente",
            message: `Sei stato assegnato come referente all'edizione #${edition.editionNumber} di ${edition.course.title} — ${edition.client.ragioneSociale}`,
            courseEditionId: context.params.edId,
            isGlobal: false,
          },
        });
      } catch {
        // ignore notification errors
      }
    } catch {
      // skip duplicates
    }
  }

  return NextResponse.json({ success: true, created });
}
