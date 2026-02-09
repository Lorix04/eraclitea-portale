import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIP, logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logAudit({
    userId: session.user.id,
    action: "COURSE_PUBLISH",
    entityType: "Course",
    entityId: context.params.id,
    ipAddress: getClientIP(request),
  });

  return NextResponse.json(
    { error: "Pubblicazione corsi non piu' supportata: usare le edizioni." },
    { status: 400 }
  );
}
