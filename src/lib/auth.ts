import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { type Role } from "@/generated/prisma";

// ─── Startup Key Validation ────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

// Load RSA keys from Base64-encoded PEM env vars
async function loadKeys() {
  const privateKeyPem = Buffer.from(requireEnv("JWT_PRIVATE_KEY_BASE64"), "base64").toString("utf8");
  const publicKeyPem  = Buffer.from(requireEnv("JWT_PUBLIC_KEY_BASE64"),  "base64").toString("utf8");
  const [privateKey, publicKey] = await Promise.all([
    importPKCS8(privateKeyPem, "RS256"),
    importSPKI(publicKeyPem,   "RS256"),
  ]);
  return { privateKey, publicKey };
}

// Cached key pair — loaded once per process
let _keys: Awaited<ReturnType<typeof loadKeys>> | null = null;
async function getKeys() {
  if (!_keys) _keys = await loadKeys();
  return _keys;
}

// ─── Token Payloads ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;          // userId
  email: string;
  name: string;
  role: Role;
  agencyId: string | null;
  agencySlug: string | null;
  type: "access";
  jti: string;          // unique token ID (for blacklisting)
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;          // userId
  type: "refresh";
  jti: string;          // unique token ID (stored in DB)
}

// Backward-compatible alias — used across all server actions via getSession()
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  agencyId?: string | null;
  agencySlug?: string | null;
  exp?: number;
}

// ─── Token Creation ───────────────────────────────────────────────────────────

const ACCESS_EXPIRY  = process.env.JWT_ACCESS_TOKEN_EXPIRY  ?? "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY ?? "7d";
const KEY_ID         = process.env.JWT_KEY_ID ?? "v1";
const ISSUER         = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function createTokenPair(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  agencyId: string | null;
  agencySlug: string | null;
}) {
  const { privateKey } = await getKeys();
  const accessJti  = randomUUID();
  const refreshJti = randomUUID();

  const accessToken = await new SignJWT({
    email:      user.email,
    name:       user.name,
    role:       user.role,
    agencyId:   user.agencyId,
    agencySlug: user.agencySlug,
    type:       "access" as const,
    jti:        accessJti,
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .setIssuer(ISSUER)
    .setAudience("gasagency-app")
    .sign(privateKey);

  const rawRefreshToken = await new SignJWT({
    type: "refresh" as const,
    jti:  refreshJti,
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .setIssuer(ISSUER)
    .setAudience("gasagency-refresh")
    .sign(privateKey);

  return { accessToken, rawRefreshToken, accessJti, refreshJti };
}

// ─── Token Verification ───────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { publicKey } = await getKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
      issuer:     ISSUER,
      audience:   "gasagency-app",
    });

    const data = payload as unknown as AccessTokenPayload;
    if (data.type !== "access") return null;

    // Check blacklist (for tokens invalidated by logout)
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { jti: data.jti },
      select: { jti: true },
    });
    if (blacklisted) return null;

    return data;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { publicKey } = await getKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
      issuer:     ISSUER,
      audience:   "gasagency-refresh",
    });
    const data = payload as unknown as RefreshTokenPayload;
    if (data.type !== "refresh") return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Cookie Management ────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost";
const COOKIE_DOMAIN = ROOT_DOMAIN === "localhost" ? ".localhost" : `.${ROOT_DOMAIN}`;

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set("at", accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   6 * 60 * 60,   // 6 hours — proxy slides this on every request
    path:     "/",
    domain:   COOKIE_DOMAIN,
  });

  cookieStore.set("rt", refreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   7 * 24 * 60 * 60, // 7 days — unchanged
    path:     "/",              // was /api/auth/refresh — proxy needs to read it on all routes
    domain:   COOKIE_DOMAIN,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set("at", "", { path: "/", domain: COOKIE_DOMAIN, maxAge: 0 });
  cookieStore.set("rt", "", { path: "/", domain: COOKIE_DOMAIN, maxAge: 0 }); // path updated to match setAuthCookies
}

// ─── Session Helpers (backward-compatible with existing actions) ──────────────

/** Get current session from access token cookie — used by all server actions */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("at")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  // Map to backward-compatible SessionPayload
  return {
    userId:     payload.sub,
    email:      payload.email,
    name:       payload.name,
    role:       payload.role,
    agencyId:   payload.agencyId,
    agencySlug: payload.agencySlug,
    exp:        payload.exp,
  };
}

/** Verify a raw token string — used by middleware */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return {
    userId:     payload.sub,
    email:      payload.email,
    name:       payload.name,
    role:       payload.role,
    agencyId:   payload.agencyId,
    agencySlug: payload.agencySlug,
    exp:        payload.exp,
  };
}

// ─── Refresh Token DB Operations ──────────────────────────────────────────────

export async function storeRefreshToken(params: {
  jti: string; userId: string; rawToken: string; ipAddress: string; userAgent: string;
}) {
  const tokenHash = await bcrypt.hash(params.rawToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      jti: params.jti, userId: params.userId, tokenHash,
      expiresAt, ipAddress: params.ipAddress, userAgent: params.userAgent,
    },
  });
}

export async function validateAndRotateRefreshToken(params: {
  jti: string; userId: string; rawToken: string;
}): Promise<{ valid: boolean; userId?: string }> {
  const record = await prisma.refreshToken.findUnique({ where: { jti: params.jti } });
  if (!record || record.isRevoked || record.userId !== params.userId || record.expiresAt < new Date()) {
    return { valid: false };
  }
  const match = await bcrypt.compare(params.rawToken, record.tokenHash);
  if (!match) return { valid: false };

  // Revoke — refresh tokens are single-use (rotation)
  await prisma.refreshToken.update({
    where: { jti: params.jti },
    data:  { isRevoked: true, revokedAt: new Date() },
  });
  return { valid: true, userId: record.userId };
}

export async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data:  { isRevoked: true, revokedAt: new Date() },
  });
}

export async function blacklistAccessToken(jti: string, expiresAt: Date) {
  await prisma.tokenBlacklist.create({ data: { jti, expiresAt } });
}

// ─── Role Routing ─────────────────────────────────────────────────────────────

export function getRoleDashboard(role: Role): string {
  const routes: Record<Role, string> = {
    SYSTEM_ADMIN:  "/system-admin",
    ADMIN:         "/admin",
    MANAGER:       "/manager",
    GODOWN_KEEPER: "/godown-keeper",
    STAFF:         "/staff",
    DELIVERY_BOY:  "/delivery-boy",
  };
  return routes[role];
}
