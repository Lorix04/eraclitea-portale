export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTeacherSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER" || !session.user.teacherId) return null;
  return session;
}

export async function GET(
  _request: Request,
  { params }: { params: { threadId: string } }
) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacherId = session.user.teacherId!;
  const { threadId } = params;

  // Verify teacher owns the thread
  const threadCheck = await prisma.teacherMessage.findFirst({
    where: { threadId, teacherId },
  });

  if (!threadCheck) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get all messages in thread
  const messages = await prisma.teacherMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });

  // Mark all as read by teacher
  await prisma.teacherMessage.updateMany({
    where: { threadId, readByTeacher: false },
    data: { readByTeacher: true },
  });

  // Find subject from the thread
  const subject = messages.find((m) => m.subject)?.subject || null;

  return NextResponse.json({
    thread: { threadId, subject },
    messages,
  });
}
