import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  validateAndRotateRefreshToken,
  createTokenPair,
  storeRefreshToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const IS_PROD       = process.env.NODE_ENV === "production";
const ROOT_DOMAIN   = process.env.ROOT_DOMAIN ?? "localhost";
const COOKIE_DOMAIN = ROOT_DOMAIN === "localhost" ? ".localhost" : `.${ROOT_DOMAIN}`;

/**
 * GET /api/auth/silent-refresh?next=<encoded-path>
 *
 * Called by proxy.ts when the AT JWT has expired but the AT cookie was still
 * present (meaning the user was active within the last 6 hours).
 * Validates the RT, rotates it, issues a fresh AT+RT pair, sets cookies,
 * and redirects the user back to their original destination.
 */
export async function GET(req: NextRequest) {
  const nextPath = req.nextUrl.searchParams.get("next") ?? "/";
  const rawRt    = req.cookies.get("rt")?.value;

  const fail = () =>
    NextResponse.redirect(new URL("/session-expired?reason=inactivity", req.url));

  if (!rawRt) return fail();

  // 1. Verify RT JWT signature
  const payload = await verifyRefreshToken(rawRt);
  if (!payload) return fail();

  // 2. Validate against DB (not revoked, hash match) and rotate
  const { valid, userId } = await validateAndRotateRefreshToken({
    jti:     payload.jti,
    userId:  payload.sub,
    rawToken: rawRt,
  });
  if (!valid || !userId) return fail();

  // 3. Load fresh user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true,
      customRole: true, customRoleId: true,
      agencyId: true, isActive: true,
      agency: { select: { slug: true, status: true } },
    },
  });
  if (!user || !user.isActive) return fail();

  if (user.agency && user.agency.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  // 4. Issue a new token pair
  const ip        = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent")       ?? "unknown";

  const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
    id:         user.id,
    email:      user.email,
    name:       user.name,
    role:       user.role,
    customRole: user.customRole,
    customRoleId: user.customRoleId,
    agencyId:   user.agencyId   ?? null,
    agencySlug: user.agency?.slug ?? null,
  });

  await storeRefreshToken({
    jti:       refreshJti,
    userId:    user.id,
    rawToken:  rawRefreshToken,
    ipAddress: ip,
    userAgent,
  });

  // 5. Redirect to original path with new cookies
  const safe     = decodeURIComponent(nextPath);
  const target   = safe.startsWith("/") ? safe : "/";
  const response = NextResponse.redirect(new URL(target, req.url));

  // Fresh AT — 6h sliding window restarts from now
  response.cookies.set("at", accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   6 * 60 * 60,        // 6 hours
    path:     "/",
    domain:   COOKIE_DOMAIN,
  });

  // New RT — 7 days (rotated for security, duration unchanged)
  response.cookies.set("rt", rawRefreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   7 * 24 * 60 * 60,   // 7 days
    path:     "/",
    domain:   COOKIE_DOMAIN,
  });

  return response;
}
