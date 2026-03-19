import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIP, logAudit } from "@/lib/audit";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_TEACHER_COOKIE,
} from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const isHttps = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const cookieStore = cookies();
    const impersonateAdminId =
      cookieStore.get(IMPERSONATE_ADMIN_COOKIE)?.value ?? null;
    const impersonateTeacherId =
      cookieStore.get(IMPERSONATE_TEACHER_COOKIE)?.value ?? null;

    if (!impersonateAdminId || !impersonateTeacherId) {
      return NextResponse.json(
        { error: "Nessuna impersonazione attiva" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/admin/docenti",
    });

    response.cookies.set(IMPERSONATE_ADMIN_COOKIE, "", {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(IMPERSONATE_TEACHER_COOKIE, "", {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    const session = await getServerSession(authOptions);
    if (
      session?.user?.role === "ADMIN" &&
      session.user.id === impersonateAdminId
    ) {
      await logAudit({
        userId: session.user.id,
        action: "IMPERSONATE_TEACHER_STOP",
        entityType: "Teacher",
        entityId: impersonateTeacherId,
        ipAddress: getClientIP(request),
      });
    }

    return response;
  } catch (error) {
    console.error("[IMPERSONATE_TEACHER_STOP_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
