import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth-edge";

// ─── Config ───────────────────────────────────────────────────────────────────

const SESSION_SECS = 6 * 60 * 60; // 6-hour inactivity sliding window
const IS_PROD      = process.env.NODE_ENV === "production";

// Role → default dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
  SYSTEM_ADMIN:  "/system-admin",
  ADMIN:         "/admin",
  MANAGER:       "/manager",
  GODOWN_KEEPER: "/godown-keeper",
  STAFF:         "/staff",
  CASHIER:       "/staff",
  DELIVERY_BOY:  "/delivery-boy",
};

// Paths that never require authentication
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/",
  "/api/public/",
  "/api/demo-count",
  "/session-expired",
  "/unauthorized",
  "/maintenance",
  "/offline",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function injectSessionHeaders(
  base: Headers,
  session: {
    userId: string;
    role: string;
    agencyId?: string | null;
    agencySlug?: string | null;
  }
): Headers {
  const h = new Headers(base);
  h.set("x-user-id",    session.userId);
  h.set("x-user-role",  session.role);
  h.set("x-agency-id",  session.agencyId  ?? "");
  h.set("x-tenant-slug", session.agencySlug ?? "");
  return h;
}

/**
 * Re-stamps the AT cookie with a fresh 6h maxAge on every valid request.
 * Implements the sliding inactivity window.
 */
function slideAtCookie(response: NextResponse, atValue: string): void {
  response.cookies.set("at", atValue, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   SESSION_SECS,
    path:     "/",
    // No `domain` — same-origin cookie only (no subdomains needed)
  });
}

// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Public paths — always open ─────────────────────────────────────────
  if (isPublicPath(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // ── 2. API routes — pass through; server actions handle their own auth ─────
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── 3. All other routes — require valid session ────────────────────────────
  const atToken = request.cookies.get("at")?.value;
  const rtToken = request.cookies.get("rt")?.value;

  if (!atToken) {
    // No AT cookie = 6h inactivity has passed (or never logged in)
    if (rtToken) {
      return NextResponse.redirect(
        new URL("/session-expired?reason=inactivity", request.url)
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyAccessTokenEdge(atToken);
  if (!session) {
    // AT JWT expired but cookie existed — attempt silent refresh
    if (rtToken) {
      const next = encodeURIComponent(pathname + request.nextUrl.search);
      return NextResponse.redirect(
        new URL(`/api/auth/silent-refresh?next=${next}`, request.url)
      );
    }
    return NextResponse.redirect(
      new URL("/session-expired?reason=inactivity", request.url)
    );
  }

  // ── 4. Role route guard — keep each role in their section ─────────────────
  const allowedPrefix = ROLE_DASHBOARD[session.role];

  // SYSTEM_ADMIN goes to /system-admin
  // All other roles must be under their designated prefix
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    // If someone navigates to "/" — redirect to their dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL(allowedPrefix, request.url));
    }
    // Otherwise block cross-role access
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // ── 5. Valid session — slide the inactivity clock and pass through ─────────
  const headers  = injectSessionHeaders(request.headers, session);
  const response = NextResponse.next({ request: { headers } });
  slideAtCookie(response, atToken);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|.*\\.png$|.*\\.svg$).*)",
  ],
};
