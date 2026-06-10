"use server";

import { prisma } from "@/lib/prisma";
import {
  createTokenPair,
  setAuthCookies,
  storeRefreshToken,
  clearAuthCookies,
  revokeAllUserTokens,
  getSession,
  blacklistAccessToken,
  getRoleDashboard,
} from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { z } from "zod";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimiter";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { verifyTOTP } from "@/lib/totp";
import { checkBackupCode } from "@/lib/totp";
import type { Role } from "@/generated/prisma";

const IS_PROD = process.env.NODE_ENV === "production";

const LoginSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
  success?: boolean;
  requires2FA?: boolean;
};

// ── Shared helper: issue tokens + set cookies ─────────────────────────────────
async function issueSession(params: {
  user: { id: string; email: string; name: string; role: Role; agencyId: string | null };
  ip: string;
  userAgent: string;
}) {
  const { user, ip, userAgent } = params;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
    id:       user.id,
    email:    user.email,
    name:     user.name,
    role:     user.role,
    agencyId: user.agencyId,
  });

  await storeRefreshToken({
    jti:       refreshJti,
    userId:    user.id,
    rawToken:  rawRefreshToken,
    ipAddress: ip,
    userAgent,
  });

  await setAuthCookies(accessToken, rawRefreshToken);

  await writeAuditLog({
    userId:     user.id,
    agencyId:   user.agencyId,
    action:     AUDIT_ACTIONS.LOGIN,
    entityType: "User",
    entityId:   user.id,
    after:      { ip, userAgent: userAgent.substring(0, 100) },
  });
}

// ── Step 1: Email + password ──────────────────────────────────────────────────
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headersList = await headers();
  const ip        = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";
  const email     = (formData.get("email") as string)?.toLowerCase().trim();

  const limitKey = `login:${ip}:${email}`;
  if (!checkRateLimit(limitKey, 5, 15 * 60_000)) {
    return { error: "Too many failed attempts. Please try again in 15 minutes." };
  }

  const parsed = LoginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true, email: true, name: true, role: true,
      agencyId: true, isActive: true, password: true,
      twoFactorEnabled: true,
    },
  });

  if (!user || !user.isActive) return { error: "Invalid email or password" };

  const valid = await bcrypt.compare(parsed.data.password, user.password);
  if (!valid) return { error: "Invalid email or password" };

  resetRateLimit(limitKey);

  if (user.twoFactorEnabled) {
    const cookieStore = await cookies();
    cookieStore.set("pending_2fa", user.id, {
      httpOnly: true,
      secure:   IS_PROD,
      sameSite: "strict",
      maxAge:   5 * 60,
      path:     "/",
    });
    return { requires2FA: true };
  }

  await issueSession({ user, ip, userAgent });
  redirect(getRoleDashboard(user.role));
}

// ── Step 2: TOTP / backup-code verification ───────────────────────────────────
export async function verify2FALogin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headersList = await headers();
  const ip        = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";
  const cookieStore = await cookies();

  const userId = cookieStore.get("pending_2fa")?.value;
  if (!userId) return { error: "Session expired. Please sign in again." };

  const token     = (formData.get("token") as string)?.trim() ?? "";
  const useBackup = formData.get("useBackup") === "true";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, agencyId: true,
      isActive: true, twoFactorSecret: true, twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return { error: "Invalid session. Please sign in again." };
  }

  if (useBackup) {
    const matchedHash = await checkBackupCode(token, user.twoFactorBackupCodes);
    if (!matchedHash) return { error: "Invalid backup code." };
    // Consume it
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h: string) => h !== matchedHash) },
    });
  } else {
    if (!user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, token)) {
      return { error: "Invalid code. Check your authenticator app." };
    }
  }

  cookieStore.delete("pending_2fa");
  await issueSession({ user, ip, userAgent });
  redirect(getRoleDashboard(user.role));
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logoutAction() {
  const session = await getSession();
  const cookieStore = await cookies();

  const atRaw = cookieStore.get("at")?.value;
  if (atRaw && session) {
    try {
      const exp = session.exp ? new Date(session.exp * 1000) : new Date(Date.now() + 15 * 60_000);
      await blacklistAccessToken(session.userId + "-" + Date.now(), exp);
    } catch { /* best effort */ }
  }

  if (session?.userId) {
    await revokeAllUserTokens(session.userId);
    await writeAuditLog({
      userId:     session.userId,
      agencyId:   session.agencyId,
      action:     AUDIT_ACTIONS.LOGOUT,
      entityType: "User",
      entityId:   session.userId,
    });
  }

  await clearAuthCookies();
  redirect("/login");
}
