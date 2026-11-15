import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenPair, storeRefreshToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/mobile-login
 * Body: { email: string, password: string }
 * Returns: { accessToken, refreshToken, expiresIn, user }
 *
 * Mobile-specific login — returns tokens in JSON body instead of httpOnly cookies.
 * Tokens are stored securely in Expo SecureStore on the device.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: (email as string).toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        agencyId: true,
        isActive: true,
        customRole: true,
        customRoleId: true,
        agency: { select: { slug: true } },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(
      password as string,
      user.password ?? ""
    );
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customRole: user.customRole,
      customRoleId: user.customRoleId,
      agencyId: user.agencyId ?? null,
      agencySlug: user.agency?.slug ?? null,
    });

    await storeRefreshToken({
      jti: refreshJti,
      userId: user.id,
      rawToken: rawRefreshToken,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 6 * 60 * 60, // 6 hours — matches ACCESS_EXPIRY
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        agencySlug: user.agency?.slug ?? null,
      },
    });
  } catch (err) {
    console.error("[mobile-login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
