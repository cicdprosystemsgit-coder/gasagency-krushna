import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth-edge";

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT_DOMAIN   = process.env.ROOT_DOMAIN ?? "localhost";
const IS_PROD       = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = ROOT_DOMAIN === "localhost" ? ".localhost" : `.${ROOT_DOMAIN}`;
const SESSION_SECS  = 6 * 60 * 60; // 6-hour inactivity window

// Role → default dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
  SYSTEM_ADMIN:  "/system-admin",
  ADMIN:         "/admin",
  MANAGER:       "/manager",
  GODOWN_KEEPER: "/godown-keeper",
  STAFF:         "/staff",
  DELIVERY_BOY:  "/delivery-boy",
};

// Paths that never require auth (on any host)
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/",
  "/api/public/",
  "/api/demo-count",
  "/session-expired",
  "/unauthorized",
  "/maintenance",
  "/offline"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Extract subdomain from hostname.
 * "sharma.localhost:3000"  → "sharma"
 * "admin.localhost:3000"   → "admin"
 * "localhost:3000"         → null
 * "sharma.gasagency.com"   → "sharma"  (production)
 */
function getSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0]; // strip port
  const rootParts = ROOT_DOMAIN.split(".");
  const hostParts = host.split(".");

  // Need strictly more parts than the root domain to have a subdomain
  if (hostParts.length <= rootParts.length) return null;

  const subdomain = hostParts.slice(0, hostParts.length - rootParts.length).join(".");

  // Ignore www and bare IP segments
  if (!subdomain || subdomain === "www" || subdomain === "127") return null;

  return subdomain;
}

/**
 * Build a redirect URL preserving the current port but changing hostname and path.
 */
function buildUrl(request: NextRequest, targetHostname: string, targetPath: string): URL {
  const url = request.nextUrl.clone();
  url.hostname = targetHostname;
  url.pathname = targetPath;
  url.search   = "";
  return url;
}

function injectSessionHeaders(base: Headers, session: {
  userId: string; role: string; agencyId?: string | null; agencySlug?: string | null;
}): Headers {
  const h = new Headers(base);
  h.set("x-user-id",    session.userId);
  h.set("x-user-role",  session.role);
  h.set("x-agency-id",  session.agencyId  ?? "");
  h.set("x-tenant-slug", session.agencySlug ?? "");
  return h;
}

/**
 * Re-stamps the AT cookie with a fresh 6h maxAge on every valid request.
 * This implements the sliding inactivity window — if the user makes a request,
 * their AT cookie expiry is extended 6h from now.
 */
function slideAtCookie(response: NextResponse, atValue: string): void {
  response.cookies.set("at", atValue, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   SESSION_SECS,
    path:     "/",
    domain:   COOKIE_DOMAIN,
  });
}

// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname     = request.headers.get("host") || "";
  const tenantSlug   = getSubdomain(hostname);

  // ── 1. ROOT DOMAIN — localhost:3000 / gasagency.com ──────────────────────
  if (!tenantSlug) {
    // Public paths and API routes are always open on the root domain
    if (isPublicPath(pathname) || pathname === "/") return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.next();

    const atToken = request.cookies.get("at")?.value;
    const rtToken = request.cookies.get("rt")?.value;

    if (!atToken) {
      // No AT cookie = 6h inactivity has passed (or never logged in)
      if (rtToken) {
        return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await verifyAccessTokenEdge(atToken);
    if (!session) {
      // AT JWT expired but cookie existed — user was recently active, silent refresh
      if (rtToken) {
        const next = encodeURIComponent(pathname + request.nextUrl.search);
        return NextResponse.redirect(new URL(`/api/auth/silent-refresh?next=${next}`, request.url));
      }
      return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
    }

    // Valid session — slide the inactivity clock
    const response = NextResponse.next({
      request: { headers: injectSessionHeaders(request.headers, session) },
    });
    slideAtCookie(response, atToken);
    return response;
  }

  // ── 2. SYSTEM ADMIN SUBDOMAIN — admin.localhost:3000 ─────────────────────
  if (tenantSlug === "admin") {
    if (isPublicPath(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.next();

    const atToken = request.cookies.get("at")?.value;
    const rtToken = request.cookies.get("rt")?.value;

    if (!atToken) {
      if (rtToken) {
        return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await verifyAccessTokenEdge(atToken);
    if (!session) {
      if (rtToken) {
        const next = encodeURIComponent(pathname + request.nextUrl.search);
        return NextResponse.redirect(new URL(`/api/auth/silent-refresh?next=${next}`, request.url));
      }
      return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
    }

    // Only SYSTEM_ADMIN belongs on this subdomain
    if (session.role !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // / → /system-admin
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/system-admin", request.url));
    }

    const headers = injectSessionHeaders(request.headers, session);
    headers.set("x-tenant-slug", "admin");
    const response = NextResponse.next({ request: { headers } });
    slideAtCookie(response, atToken);
    return response;
  }

  // ── 3. TENANT SUBDOMAIN — sharma.localhost:3000 ──────────────────────────

  // Login page is always accessible on a tenant subdomain (needed for branding)
  if (isPublicPath(pathname)) {
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", tenantSlug);
    return NextResponse.next({ request: { headers } });
  }

  // API routes pass through with tenant slug injected
  if (pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", tenantSlug);
    return NextResponse.next({ request: { headers } });
  }

  // Protected routes: must be authenticated
  const atToken = request.cookies.get("at")?.value;
  const rtToken = request.cookies.get("rt")?.value;

  if (!atToken) {
    if (rtToken) {
      return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyAccessTokenEdge(atToken);
  if (!session) {
    if (rtToken) {
      const next = encodeURIComponent(pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(`/api/auth/silent-refresh?next=${next}`, request.url));
    }
    return NextResponse.redirect(new URL("/session-expired?reason=inactivity", request.url));
  }

  // SYSTEM_ADMIN landed on a tenant subdomain → send to admin subdomain
  if (session.role === "SYSTEM_ADMIN") {
    return NextResponse.redirect(
      buildUrl(request, `admin.${ROOT_DOMAIN}`, "/system-admin")
    );
  }

  // Cross-tenant protection: JWT agencySlug must match the current subdomain.
  if (session.agencySlug && session.agencySlug !== tenantSlug) {
    return NextResponse.redirect(
      buildUrl(request, `${session.agencySlug}.${ROOT_DOMAIN}`, pathname)
    );
  }

  // Role route guard: keep each role in their section
  const allowedPrefix = ROLE_DASHBOARD[session.role];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // / → role dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL(allowedPrefix ?? "/login", request.url));
  }

  // Valid session — slide the inactivity clock
  const headers = injectSessionHeaders(request.headers, session);
  headers.set("x-tenant-slug", tenantSlug);
  const response = NextResponse.next({ request: { headers } });
  slideAtCookie(response, atToken);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|.*\\.png$|.*\\.svg$).*)",
  ],
};
