import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: {
      id: true,
      courseId: true,
      _count: {
        select: {
          registrations: true,
          lessons: true,
          attendances: true,
          certificates: true,
        },
      },
    },
  });

  if (!edition || edition.courseId !== context.params.id) {
    return NextResponse.json({ error: "Edizione non trovata" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      registrations: edition._count.registrations,
      lessons: edition._count.lessons,
      attendances: edition._count.attendances,
      certificates: edition._count.certificates,
    },
  });
}
