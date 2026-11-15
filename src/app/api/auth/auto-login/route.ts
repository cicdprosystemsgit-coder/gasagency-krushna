import { NextRequest, NextResponse } from "next/server";
import { getSession, rollSessionForNext6Hours, getRoleDashboard } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/auth/auto-login
 *
 * Dedicated endpoint for browser and mobile app clients:
 * If a user used the same email within the last 6 hours:
 * 1. Confirms the active session and grants direct access.
 * 2. Continuously rolls/refreshes the token and cookies for the NEXT 6 hours.
 */
export async function GET(req: NextRequest) {
  return handleAutoLogin(req);
}

export async function POST(req: NextRequest) {
  return handleAutoLogin(req);
}

async function handleAutoLogin(req: NextRequest) {
  const session = await getSession();

  let requestedEmail = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!requestedEmail && req.method === "POST") {
    try {
      const body = await req.json();
      requestedEmail = body.email?.toLowerCase().trim();
    } catch {
      // Body parsing optional
    }
  }

  // If there's an active session
  if (session && session.userId) {
    // If a specific email was provided, verify it matches the active session
    if (requestedEmail && session.email.toLowerCase() !== requestedEmail) {
      return NextResponse.json({
        canAutoLogin: false,
        directLogin: false,
        reason: "email_mismatch",
      });
    }

    // Refresh token and cookies for the next 6 hours (2nd time, 3rd time, so on)
    const rolled = await rollSessionForNext6Hours(session.userId);

    const dashboard = getRoleDashboard(session.role);

    return NextResponse.json({
      canAutoLogin: true,
      directLogin: true,
      email: session.email,
      name: session.name,
      role: session.role,
      dashboard,
      token: rolled?.accessToken,
      expiresInSeconds: 6 * 60 * 60, // 6 hours
    });
  }

  // No active session within 6 hours
  return NextResponse.json({
    canAutoLogin: false,
    directLogin: false,
    reason: "no_active_session_within_6h",
  });
}

