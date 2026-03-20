export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function POST() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const result = await prisma.notification.updateMany({
    where: { userId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true, count: result.count });
}
