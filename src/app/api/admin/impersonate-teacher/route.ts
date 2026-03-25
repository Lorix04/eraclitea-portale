import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIP, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_TEACHER_COOKIE,
  IMPERSONATE_MAX_AGE_SECONDS,
} from "@/lib/impersonate";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const isHttps = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    if (!checkApiPermission(session, "docenti", "impersonate")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const teacherId = typeof body?.teacherId === "string" ? body.teacherId : "";

    if (!teacherId) {
      return NextResponse.json({ error: "TeacherId mancante" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        userId: true,
        user: { select: { id: true, isActive: true } },
      },
    });

    if (!teacher || !teacher.userId) {
      return NextResponse.json({ error: "Docente non trovato o senza account" }, { status: 404 });
    }

    if (teacher.status !== "ACTIVE" || !teacher.user?.isActive) {
      return NextResponse.json({ error: "Docente non attivo" }, { status: 400 });
    }

    const teacherName = `${teacher.firstName} ${teacher.lastName}`;

    const response = NextResponse.json({
      success: true,
      redirectTo: "/docente",
      teacherName,
    });

    response.cookies.set(IMPERSONATE_ADMIN_COOKIE, session.user.id, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: IMPERSONATE_MAX_AGE_SECONDS,
      path: "/",
    });

    response.cookies.set(IMPERSONATE_TEACHER_COOKIE, teacher.id, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: IMPERSONATE_MAX_AGE_SECONDS,
      path: "/",
    });

    await logAudit({
      userId: session.user.id,
      action: "IMPERSONATE_TEACHER_START",
      entityType: "Teacher",
      entityId: teacher.id,
      ipAddress: getClientIP(request),
    });

    return response;
  } catch (error) {
    console.error("[IMPERSONATE_TEACHER_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
