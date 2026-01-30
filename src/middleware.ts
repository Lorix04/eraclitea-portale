import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

const AUTH_ROUTES = ["/login", "/recupera-password"];
const AUTH_ROUTE_PREFIXES = ["/reset-password"];

function isClientRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/corsi") ||
    pathname.startsWith("/notifiche") ||
    pathname.startsWith("/attestati") ||
    pathname.startsWith("/storico") ||
    pathname.startsWith("/profilo")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const ip =
      req.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const isAuthRoute = pathname === "/api/auth/callback/credentials";
    const { success, remaining } = await checkRateLimit(
      `${isAuthRoute ? "auth" : "api"}:${ip}`,
      isAuthRoute ? 5 : 100,
      60_000
    );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (
    AUTH_ROUTES.includes(pathname) ||
    AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    if (token?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (token?.role === "CLIENT") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isClientRoute(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/login",
    "/recupera-password",
    "/reset-password/:path*",
    "/corsi/:path*",
    "/notifiche/:path*",
    "/attestati/:path*",
    "/storico/:path*",
    "/profilo/:path*",
    "/admin/:path*",
  ],
};
