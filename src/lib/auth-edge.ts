/**
 * Edge-compatible JWT verification — uses only the `jose` library.
 * No Node.js crypto, no bcrypt, no Prisma.
 * Used exclusively by the proxy/middleware layer.
 */
import { jwtVerify, importSPKI } from "jose";
import { type Role } from "@/generated/prisma";

export interface EdgeSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  agencyId?: string | null;
}

const ISSUER   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

let _publicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (_publicKey) return _publicKey;
  const b64 = process.env.JWT_PUBLIC_KEY_BASE64;
  if (!b64) throw new Error("JWT_PUBLIC_KEY_BASE64 is not set");
  const pem = atob(b64);
  _publicKey = await importSPKI(pem, "RS256");
  return _publicKey;
}

/**
 * Verify an access token using only Edge-compatible APIs.
 * Does NOT check blacklist (no DB access in Edge) — that's handled by the
 * full verifyAccessToken() in auth.ts for server-side checks.
 */
export async function verifyAccessTokenEdge(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
      issuer:     ISSUER,
      audience:   "gasagency-app",
    });

    const data = payload as Record<string, unknown>;
    if (data.type !== "access") return null;

    return {
      userId:   data.sub as string,
      email:    data.email as string,
      name:     data.name as string,
      role:     data.role as Role,
      agencyId: (data.agencyId as string) ?? null,
    };
  } catch {
    return null;
  }
}
