import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  validateAndRotateRefreshToken,
  createTokenPair,
  storeRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const rawToken = req.cookies.get("rt")?.value;
  if (!rawToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  // Verify JWT signature
  const payload = await verifyRefreshToken(rawToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Validate against DB (checks not revoked, hash match) + rotate
  const { valid, userId } = await validateAndRotateRefreshToken({
    jti: payload.jti,
    userId: payload.sub,
    rawToken,
  });
  if (!valid || !userId) {
    return NextResponse.json({ error: "Token revoked or expired" }, { status: 401 });
  }

  // Load fresh user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, agencyId: true, isActive: true,
      agency: { select: { slug: true } },
    },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Account inactive" }, { status: 401 });
  }

  // Issue new token pair (old refresh token already revoked above)
  const ip        = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
    id:         user.id,
    email:      user.email,
    name:       user.name,
    role:       user.role,
    agencyId:   user.agencyId ?? null,
    agencySlug: user.agency?.slug ?? null,
  });

  await storeRefreshToken({
    jti: refreshJti,
    userId: user.id,
    rawToken: rawRefreshToken,
    ipAddress: ip,
    userAgent,
  });

  await setAuthCookies(accessToken, rawRefreshToken);

  return NextResponse.json({ ok: true });
}
