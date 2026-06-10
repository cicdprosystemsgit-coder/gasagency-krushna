import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/actions/api-gateway";
import { prisma } from "@/lib/prisma";

/** Shared API v1 auth middleware — validates Bearer token API key */
export async function withApiAuth(
  req: NextRequest,
  handler: (agencyId: string, scopes: string[]) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer gak_")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const rawKey = auth.slice(7);
  const result = await validateApiKey(rawKey);

  if (!result.valid || !result.agencyId) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  return handler(result.agencyId, result.scopes ?? []);
}

export function requireScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}
