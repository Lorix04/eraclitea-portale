import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody, validateQuery } from "@/lib/api-utils";
import { courseEditionSchema } from "@/lib/schemas";
import { z } from "zod";
import { formatDate } from "@/lib/date-utils";
import { sendNewEditionEmail } from "@/lib/email-notifications";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  clientId: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = validateQuery(request, querySchema);
    if ("error" in validation) {
      return validation.error;
    }

    const { clientId, status } = validation.data;
    const page = validation.data.page ?? 1;
    const limit = validation.data.limit ?? 20;
    const skip = (page - 1) * limit;

    const course = await prisma.course.findUnique({
      where: { id: context.params.id },
      select: { id: true, title: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
    }

    const where = {
      courseId: context.params.id,
      ...(clientId ? { clientId } : {}),
      ...(status ? { status } : {}),
    };

    const [editions, total] = await prisma.$transaction([
      prisma.courseEdition.findMany({
        where,
        include: {
          client: { select: { id: true, ragioneSociale: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: [
          { client: { ragioneSociale: "asc" } },
          { editionNumber: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.courseEdition.count({ where }),
    ]);

    return NextResponse.json({
      data: editions,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("[COURSE_EDITIONS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = await validateBody(request, courseEditionSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const course = await prisma.course.findUnique({
      where: { id: context.params.id },
      select: { id: true, title: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
    }

    const data = validation.data;

    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      return NextResponse.json(
        { error: "La data di fine deve essere successiva alla data di inizio" },
        { status: 400 }
      );
    }

    if (
      data.startDate &&
      data.deadlineRegistry &&
      data.deadlineRegistry >= data.startDate
    ) {
      return NextResponse.json(
        {
          error:
            "La deadline anagrafiche deve essere precedente alla data di inizio",
        },
        { status: 400 }
      );
    }

    const lastEdition = await prisma.courseEdition.findFirst({
      where: { courseId: context.params.id, clientId: data.clientId },
      orderBy: { editionNumber: "desc" },
      select: { editionNumber: true },
    });

    const editionNumber = (lastEdition?.editionNumber ?? 0) + 1;

    const created = await prisma.courseEdition.create({
      data: {
        courseId: context.params.id,
        clientId: data.clientId,
        editionNumber,
        startDate: (data.startDate as Date | null | undefined) ?? null,
        endDate: (data.endDate as Date | null | undefined) ?? null,
        deadlineRegistry: (data.deadlineRegistry as Date | null | undefined) ?? null,
        status: data.status ?? "DRAFT",
        notes: data.notes ?? null,
      },
      include: {
        client: {
          select: {
            id: true,
            ragioneSociale: true,
            referenteEmail: true,
            referenteNome: true,
          },
        },
      },
    });

    if (created.status === "PUBLISHED") {
      await prisma.notification.create({
        data: {
          type: "NEW_EDITION",
          title: "Nuova edizione disponibile",
          message: `${course.title} (Ed. #${editionNumber}) e ora disponibile.`,
          courseEditionId: created.id,
          isGlobal: false,
        },
      });
    }

    if (created.status === "PUBLISHED" && created.client?.referenteEmail) {
      void sendNewEditionEmail({
        clientEmail: created.client.referenteEmail,
        clientName: created.client.referenteNome || created.client.ragioneSociale,
        clientId: created.client.id,
        courseName: course.title,
        editionNumber: created.editionNumber,
        startDate: formatDate(created.startDate),
        endDate: formatDate(created.endDate),
        deadlineRegistry: formatDate(created.deadlineRegistry),
        courseEditionId: created.id,
      });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[COURSE_EDITIONS_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
