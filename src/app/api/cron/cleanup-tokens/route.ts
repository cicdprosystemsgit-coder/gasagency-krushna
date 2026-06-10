import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Scheduled cleanup job — removes expired tokens from the database.
 * Call from Vercel Cron, GitHub Actions, or any scheduler.
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [deletedBlacklist, deletedRefresh] = await Promise.all([
    // Remove expired blacklist entries (access tokens already expired naturally)
    prisma.tokenBlacklist.deleteMany({ where: { expiresAt: { lt: now } } }),
    // Remove expired or old revoked refresh tokens
    prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isRevoked: true, revokedAt: { lt: thirtyDaysAgo } },
        ],
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deletedBlacklist: deletedBlacklist.count,
    deletedRefresh: deletedRefresh.count,
  });
}
