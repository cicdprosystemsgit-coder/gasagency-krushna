import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth-edge";

const PUBLIC_ROUTES = ["/", "/login"];
const ROLE_ROUTES: Record<string, string[]> = {
  SYSTEM_ADMIN:  ["/system-admin"],
  ADMIN:         ["/admin"],
  MANAGER:       ["/manager"],
  GODOWN_KEEPER: ["/godown-keeper"],
  STAFF:         ["/staff"],
  DELIVERY_BOY:  ["/delivery-boy"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();

  // Read access token from "at" cookie
  const token = request.cookies.get("at")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyAccessTokenEdge(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("at");
    res.cookies.delete("rt");
    return res;
  }

  // Role-based route guard
  const allowedPrefixes = ROLE_ROUTES[session.role] ?? [];
  const hasAccess = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!hasAccess && pathname !== "/") {
    const dashboardPath = ROLE_ROUTES[session.role]?.[0] ?? "/login";
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Forward user info in headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-agency-id", session.agencyId ?? "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|.*\\.png$|.*\\.svg$|public).*)"],
};
