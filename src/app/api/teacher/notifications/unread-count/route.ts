export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const count = await prisma.notification.count({
    where: { userId: ctx.userId, readAt: null },
  });

  return NextResponse.json({ count });
}
