import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  verifyRefreshToken,
  blacklistAccessToken,
  revokeAllUserTokens,
  clearAuthCookies,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const at = req.cookies.get("at")?.value;
  const rt = req.cookies.get("rt")?.value;

  // Blacklist access token immediately (so it can't be reused until natural expiry)
  if (at) {
    const payload = await verifyAccessToken(at);
    if (payload?.jti) {
      const exp = new Date((payload.exp ?? 0) * 1000);
      await blacklistAccessToken(payload.jti, exp).catch(() => {});
    }
  }

  // Revoke all refresh tokens for this user
  if (rt) {
    const payload = await verifyRefreshToken(rt);
    if (payload?.sub) {
      await revokeAllUserTokens(payload.sub).catch(() => {});
    }
  }

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
