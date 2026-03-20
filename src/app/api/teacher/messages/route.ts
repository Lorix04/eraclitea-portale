export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export async function GET() {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  // Get all messages for this teacher, group by threadId
  const messages = await prisma.teacherMessage.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });

  // Group by threadId, get last message and unread count per thread
  const threadMap = new Map<
    string,
    {
      threadId: string;
      subject: string | null;
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
        lastMessage: msg,
        unreadCount: 0,
        messagesCount: 0,
        createdAt: msg.createdAt,
      });
    }
    const thread = threadMap.get(msg.threadId)!;
    thread.messagesCount++;
    if (msg.subject) thread.subject = msg.subject;
    if (!msg.readByTeacher) thread.unreadCount++;
    // Track earliest createdAt for thread creation date
    if (msg.createdAt < thread.createdAt) thread.createdAt = msg.createdAt;
  }

  const threads = Array.from(threadMap.values()).sort(
    (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
  );

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return NextResponse.json({ threads, totalUnread });
}

export async function POST(request: Request) {
  const ctx = await getEffectiveTeacherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const teacherId = ctx.teacherId;

  let body: { threadId?: string; subject?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content } = body;
  let { threadId, subject } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Get teacher record for senderName
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { firstName: true, lastName: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const senderName = `${teacher.firstName} ${teacher.lastName}`;

  if (!threadId) {
    // New thread — subject is required
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required for new threads" }, { status: 400 });
    }
    threadId = crypto.randomUUID();
  } else {
    // Reply — verify teacher owns the thread
    const existing = await prisma.teacherMessage.findFirst({
      where: { threadId, teacherId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    // Don't set subject on replies
    subject = undefined;
  }

  const message = await prisma.teacherMessage.create({
    data: {
      teacherId,
      threadId,
      subject: subject?.trim() || null,
      content: content.trim(),
      senderRole: "TEACHER",
      senderId: ctx.userId,
      senderName,
      readByTeacher: true,
      readByAdmin: false,
    },
  });

  return NextResponse.json({ success: true, threadId, messageId: message.id });
}
