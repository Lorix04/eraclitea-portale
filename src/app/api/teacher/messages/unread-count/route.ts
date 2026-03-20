export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  const count = await prisma.teacherMessage.count({
    where: { teacherId, readByTeacher: false },
  });

  return NextResponse.json({ count });
}
