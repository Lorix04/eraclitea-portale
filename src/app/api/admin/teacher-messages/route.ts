export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all messages across all teachers
  const messages = await prisma.teacherMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Group by threadId
  const threadMap = new Map<
    string,
    {
      threadId: string;
      subject: string | null;
      teacherId: string;
      teacherName: string;
      lastMessage: (typeof messages)[0];
      unreadCount: number;
      messagesCount: number;
      createdAt: Date;
    }
  >();

  for (const msg of messages) {
    if (!threadMap.has(msg.threadId)) {
      threadMap.set(msg.threadId, {
        threadId: msg.threadId,
        subject: null,
        teacherId: msg.teacherId,
        teacherName: `${msg.teacher.firstName} ${msg.teacher.lastName}`,
        lastMessage: msg,
        unreadCount: 0,
        messagesCount: 0,
        createdAt: msg.createdAt,
      });
    }
    const thread = threadMap.get(msg.threadId)!;
    thread.messagesCount++;
    if (msg.subject) thread.subject = msg.subject;
    if (!msg.readByAdmin) thread.unreadCount++;
    // Track earliest createdAt for thread creation date
    if (msg.createdAt < thread.createdAt) thread.createdAt = msg.createdAt;
  }

  const threads = Array.from(threadMap.values()).sort(
    (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
  );

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { threadId?: string; teacherId?: string; subject?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content } = body;
  let { threadId, teacherId, subject } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (!threadId) {
    // New thread — teacherId and subject required
    if (!teacherId) {
      return NextResponse.json({ error: "teacherId is required for new threads" }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required for new threads" }, { status: 400 });
    }

    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    threadId = crypto.randomUUID();
  } else {
    // Reply — find existing thread for teacherId
    const existing = await prisma.teacherMessage.findFirst({
      where: { threadId },
      select: { teacherId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    teacherId = existing.teacherId;
    // Don't set subject on replies
    subject = undefined;
  }

  const message = await prisma.teacherMessage.create({
    data: {
      teacherId,
      threadId,
      subject: subject?.trim() || null,
      content: content.trim(),
      senderRole: "ADMIN",
      senderId: session.user.id,
      senderName: "Admin",
      readByAdmin: true,
      readByTeacher: false,
    },
  });

  // Create notification for teacher
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true, firstName: true, lastName: true },
  });

  if (teacher?.userId) {
    await prisma.notification.create({
      data: {
        type: "TEACHER_MESSAGE_RECEIVED",
        title: "Nuovo messaggio dall'amministrazione",
        message: subject?.trim() || content.trim().substring(0, 100),
        userId: teacher.userId,
      },
    });
  }

  return NextResponse.json({ success: true, threadId, messageId: message.id });
}
