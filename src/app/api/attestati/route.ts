import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "CLIENT") {
    const certificates = await prisma.certificate.findMany({
      where: { clientId: session.user.clientId ?? "" },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json({ data: certificates });
  }

  const certificates = await prisma.certificate.findMany({
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json({ data: certificates });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Upload non ancora implementato" },
    { status: 501 }
  );
}
