import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIP, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_CLIENT_COOKIE,
  IMPERSONATE_MAX_AGE_SECONDS,
} from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const isHttps = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const clientUserId =
      typeof body?.clientUserId === "string"
        ? body.clientUserId
        : typeof body?.clientId === "string"
          ? body.clientId
          : "";

    if (!clientUserId) {
      return NextResponse.json({ error: "ClientId mancante" }, { status: 400 });
    }

    const clientUser = await prisma.user.findUnique({
      where: { id: clientUserId },
      select: {
        id: true,
        role: true,
        isActive: true,
        clientId: true,
        email: true,
        client: { select: { ragioneSociale: true, isActive: true } },
      },
    });

    if (!clientUser || clientUser.role !== "CLIENT" || !clientUser.clientId) {
      return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
    }

    if (!clientUser.isActive || clientUser.client?.isActive === false) {
      return NextResponse.json({ error: "Cliente disattivato" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      clientName: clientUser.client?.ragioneSociale ?? clientUser.email,
    });

    response.cookies.set(IMPERSONATE_ADMIN_COOKIE, session.user.id, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: IMPERSONATE_MAX_AGE_SECONDS,
      path: "/",
    });

    response.cookies.set(IMPERSONATE_CLIENT_COOKIE, clientUser.id, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: IMPERSONATE_MAX_AGE_SECONDS,
      path: "/",
    });

    await logAudit({
      userId: session.user.id,
      action: "IMPERSONATE_START",
      entityType: "User",
      entityId: clientUser.id,
      ipAddress: getClientIP(request),
    });

    return response;
  } catch (error) {
    console.error("[IMPERSONATE_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
