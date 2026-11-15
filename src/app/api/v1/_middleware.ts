import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-gateway";
import { verifyAccessToken } from "@/lib/auth";

/**
 * Shared API v1 auth middleware
 * Validates either:
 * 1. External developer API key (Bearer gak_...)
 * 2. Mobile app JWT access token (Bearer eyJ...)
 */
export async function withApiAuth(
  req: NextRequest,
  handler: (agencyId: string, scopes: string[], userId?: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const rawToken = auth.slice(7);

  // 1. API Gateway Key check
  if (rawToken.startsWith("gak_")) {
    const result = await validateApiKey(rawToken);
    if (!result.valid || !result.agencyId) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }
    return handler(result.agencyId, result.scopes ?? []);
  }

  // 2. User JWT Access Token check (for mobile app requests)
  const payload = await verifyAccessToken(rawToken);
  if (payload && payload.agencyId) {
    const mobileScopes = [
      "deliveries:read",
      "deliveries:write",
      "customers:read",
      "customers:write",
      "inventory:read",
      "inventory:write",
    ];
    return handler(payload.agencyId, mobileScopes, payload.sub);
  }

  return NextResponse.json({ error: "Invalid or expired authorization token" }, { status: 401 });
}

export function requireScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}
