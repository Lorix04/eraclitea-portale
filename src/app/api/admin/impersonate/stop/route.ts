import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIP, logAudit } from "@/lib/audit";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_CLIENT_COOKIE,
} from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const impersonateAdminId =
      cookieStore.get(IMPERSONATE_ADMIN_COOKIE)?.value ?? null;
    const impersonatedClientUserId =
      cookieStore.get(IMPERSONATE_CLIENT_COOKIE)?.value ?? null;

    if (!impersonateAdminId || !impersonatedClientUserId) {
      return NextResponse.json(
        { error: "Nessuna impersonazione attiva" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/admin/clienti",
    });

    response.cookies.set(IMPERSONATE_ADMIN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(IMPERSONATE_CLIENT_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
        action: "IMPERSONATE_STOP",
        entityType: "User",
        entityId: impersonatedClientUserId,
        ipAddress: getClientIP(request),
      });
    }

    return response;
  } catch (error) {
    console.error("[IMPERSONATE_STOP_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
