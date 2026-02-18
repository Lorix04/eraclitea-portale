import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EMAIL_TYPE_LABEL_MAP } from "@/lib/email-preferences";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limitRaw = Number(searchParams.get("limit") || 20);
  const limit = Math.max(1, Math.min(100, limitRaw));
  const type = (searchParams.get("type") || "").trim();
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  const search = (searchParams.get("search") || "").trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const where: Prisma.EmailLogWhereInput = {};

  if (type) {
    where.emailType = type;
  }

  if (status && ["SENT", "FAILED", "PENDING"].includes(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { recipientEmail: { contains: search, mode: "insensitive" } },
      { recipientName: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);
    where.sentAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
    prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return NextResponse.json({
    data: items.map((item) => ({
      ...item,
      label: EMAIL_TYPE_LABEL_MAP[item.emailType] || item.emailType,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
