import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

const AUTH_ROUTES = ["/login", "/recupera-password"];
const AUTH_ROUTE_PREFIXES = ["/reset-password"];
const PUBLIC_EXACT_ROUTES = ["/come-funziona"];
const IMPERSONATE_ADMIN_COOKIE = "impersonate_admin_id";
const IMPERSONATE_CLIENT_COOKIE = "impersonate_client_id";

function isClientRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/corsi") ||
    pathname.startsWith("/dipendenti") ||
    pathname.startsWith("/notifiche") ||
    pathname.startsWith("/attestati") ||
    pathname.startsWith("/supporto") ||
    pathname.startsWith("/storico") ||
    pathname.startsWith("/profilo")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const impersonateAdminId = req.cookies.get(IMPERSONATE_ADMIN_COOKIE)?.value;
  const impersonateClientId = req.cookies.get(IMPERSONATE_CLIENT_COOKIE)?.value;
  const tokenUserId =
    (typeof token?.id === "string" && token.id) ||
    (typeof token?.sub === "string" && token.sub) ||
    null;
  const hasImpersonationCookies = Boolean(
    impersonateAdminId && impersonateClientId
  );
  const isImpersonationOwnerMatch =
    !tokenUserId || impersonateAdminId === tokenUserId;
  const isImpersonatingClient =
    token?.role === "ADMIN" &&
    hasImpersonationCookies &&
    isImpersonationOwnerMatch;
  const effectiveRole = isImpersonatingClient ? "CLIENT" : token?.role;

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

    const isReadOnlyMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const isImpersonateStopRoute = pathname === "/api/admin/impersonate/stop";
    const isAuthApiRoute = pathname.startsWith("/api/auth/");
    const isMutationMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(
      req.method
    );

    if (isMutationMethod && !isAuthApiRoute) {
      const host = req.headers.get("host");
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const source = origin ?? referer;

      if (host && source) {
        try {
          const sourceHost = new URL(source).host;
          if (sourceHost !== host) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    if (
      isImpersonatingClient &&
      isReadOnlyMethod &&
      !isImpersonateStopRoute &&
      !isAuthApiRoute
    ) {
      return NextResponse.json(
        { error: "Impersonazione attiva in sola lettura" },
        { status: 403 }
      );
    }

    if (
      isImpersonatingClient &&
      pathname.startsWith("/api/admin/") &&
      pathname !== "/api/admin/impersonate/status" &&
      pathname !== "/api/admin/impersonate/stop"
    ) {
      return NextResponse.json(
        { error: "Area admin non disponibile durante l'impersonazione" },
        { status: 403 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  if (pathname === "/") {
    if (effectiveRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (effectiveRole === "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_EXACT_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (
    AUTH_ROUTES.includes(pathname) ||
    AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    if (effectiveRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (effectiveRole === "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (effectiveRole === "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (effectiveRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isClientRoute(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (effectiveRole !== "CLIENT") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/come-funziona",
    "/login",
    "/recupera-password",
    "/reset-password/:path*",
    "/dashboard/:path*",
    "/corsi/:path*",
    "/dipendenti/:path*",
    "/notifiche/:path*",
    "/attestati/:path*",
    "/supporto/:path*",
    "/storico/:path*",
    "/profilo/:path*",
    "/admin/ticket/:path*",
    "/admin/:path*",
  ],
};
