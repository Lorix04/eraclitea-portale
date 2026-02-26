import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const luoghi = await prisma.lesson.findMany({
      where: {
        luogo: {
          not: null,
        },
      },
      select: {
        luogo: true,
      },
      distinct: ["luogo"],
      orderBy: {
        luogo: "asc",
      },
    });

    return NextResponse.json(
      luoghi
        .map((entry) => entry.luogo?.trim() ?? "")
        .filter((entry) => entry.length > 0)
    );
  } catch (error) {
    console.error("[LESSON_LOCATIONS_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
