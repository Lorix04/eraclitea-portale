export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (notification.userId !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.notification.update({
    where: { id: params.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
