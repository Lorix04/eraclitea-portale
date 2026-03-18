export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;

  // Get all messages in thread, include teacher relation on first query
  const messages = await prisma.teacherMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (messages.length === 0) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Mark all as read by admin
  await prisma.teacherMessage.updateMany({
    where: { threadId, readByAdmin: false },
    data: { readByAdmin: true },
  });

  // Extract thread metadata from first message with teacher info
  const firstMessage = messages[0];
  const subject = messages.find((m) => m.subject)?.subject || null;

  return NextResponse.json({
    thread: {
      threadId,
      subject,
      teacherId: firstMessage.teacherId,
      teacherName: `${firstMessage.teacher.firstName} ${firstMessage.teacher.lastName}`,
    },
    messages,
  });
}
