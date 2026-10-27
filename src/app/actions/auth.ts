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
  email?: string;
};

// ── Shared helper: issue tokens + set cookies ─────────────────────────────────
async function issueSession(params: {
  user: { id: string; email: string; name: string; role: Role; customRole: string | null; customRoleId: string | null; agencyId: string | null; agencySlug: string | null };
  ip: string;
  userAgent: string;
}) {
  const { user, ip, userAgent } = params;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
    id:         user.id,
    email:      user.email,
    name:       user.name,
    role:       user.role,
    customRole: user.customRole,
    customRoleId: user.customRoleId,
    agencyId:   user.agencyId,
    agencySlug: user.agencySlug,
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
      customRole: true, customRoleId: true,
      agencyId: true, isActive: true, password: true,
      twoFactorEnabled: true,
      agency: { select: { slug: true, status: true } },
    },
  });

  if (!user || !user.isActive) return { error: "Invalid email or password" };

  if (user.agency && user.agency.status !== "ACTIVE") {
    redirect("/maintenance");
  }

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
    cookieStore.set("pending_2fa_email", user.email, {
      httpOnly: false,
      secure:   IS_PROD,
      sameSite: "lax",
      maxAge:   5 * 60,
      path:     "/",
    });
    return { requires2FA: true, email: user.email };
  }

  await issueSession({
    user: { ...user, agencyId: user.agencyId ?? null, agencySlug: user.agency?.slug ?? null },
    ip,
    userAgent,
  });
  redirect(getRoleDashboard(user.role));
}

// ── Step 1B: PIN-based Login (Identifier + 4-6 digit numeric PIN) ───────────────
export async function loginWithPinAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headersList = await headers();
  const ip        = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";
  const identifier = ((formData.get("identifier") as string) ?? "").trim();
  const pin        = ((formData.get("pin") as string) ?? "").trim();

  if (!identifier) {
    return { error: "Please enter your mobile number or email address." };
  }

  // Strict check: PIN must be numbers only, 4 to 6 digits
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return { error: "PIN must be between 4 and 6 numbers only." };
  }

  const cleanId = identifier.toLowerCase();
  const phone10 = cleanId.replace(/\D/g, "").slice(-10);
  const isPhone = cleanId.replace(/\D/g, "").length >= 10;

  const limitKey = `pin_login:${ip}:${cleanId}`;
  if (!checkRateLimit(limitKey, 5, 15 * 60_000)) {
    return { error: "Too many failed attempts. Please try again in 15 minutes." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: isPhone
        ? [{ phone: phone10 }, { phone: `+91${phone10}` }, { phone: `91${phone10}` }]
        : [{ email: cleanId }],
    },
    select: {
      id: true, email: true, name: true, role: true,
      customRole: true, customRoleId: true,
      agencyId: true, isActive: true, loginPin: true,
      twoFactorEnabled: true,
      agency: { select: { slug: true, status: true } },
    },
  });

  if (!user || !user.isActive) {
    return { error: "Invalid mobile number/email or PIN." };
  }

  if (user.agency && user.agency.status !== "ACTIVE") {
    redirect("/maintenance");
  }

  if (!user.loginPin) {
    return { error: "No PIN has been configured for this account. Please sign in with your password." };
  }

  const valid = await bcrypt.compare(pin, user.loginPin);
  if (!valid) {
    return { error: "Invalid mobile number/email or PIN." };
  }

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
    cookieStore.set("pending_2fa_email", user.email, {
      httpOnly: false,
      secure:   IS_PROD,
      sameSite: "lax",
      maxAge:   5 * 60,
      path:     "/",
    });
    return { requires2FA: true, email: user.email };
  }

  await issueSession({
    user: { ...user, agencyId: user.agencyId ?? null, agencySlug: user.agency?.slug ?? null },
    ip,
    userAgent,
  });
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
  const pendingEmail = cookieStore.get("pending_2fa_email")?.value;
  if (!userId) {
    return { error: "Verification session expired. Please sign in with your email and password again." };
  }

  const limitKey = `2fa:${userId}:${ip}`;
  if (!checkRateLimit(limitKey, 5, 15 * 60_000)) {
    return {
      error: "Too many failed 2FA attempts. For security, please wait 15 minutes before trying again.",
      email: pendingEmail,
    };
  }

  const token     = (formData.get("token") as string)?.trim() ?? "";
  const useBackup = formData.get("useBackup") === "true";

  if (!token) {
    return {
      error: useBackup ? "Please enter your backup code." : "Please enter the 6-digit code from Google Authenticator.",
      email: pendingEmail,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, agencyId: true,
      customRole: true, customRoleId: true,
      isActive: true, twoFactorSecret: true, twoFactorEnabled: true,
      twoFactorBackupCodes: true,
      agency: { select: { slug: true, status: true } },
    },
  });

  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return { error: "Invalid session. Please sign in again." };
  }

  if (user.agency && user.agency.status !== "ACTIVE") {
    cookieStore.delete("pending_2fa");
    cookieStore.delete("pending_2fa_email");
    redirect("/maintenance");
  }

  if (useBackup) {
    const matchedHash = await checkBackupCode(token, user.twoFactorBackupCodes);
    if (!matchedHash) {
      return {
        error: "Invalid backup code. Ensure it is entered accurately (e.g. XXXX-XXXX). Each backup code can only be used once.",
        email: user.email,
      };
    }
    // Consume it
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h: string) => h !== matchedHash) },
    });
  } else {
    if (!user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, token)) {
      return {
        error: "Invalid 6-digit code. Please verify that your device clock is set to automatic and enter the current code from your authenticator app.",
        email: user.email,
      };
    }
  }

  resetRateLimit(limitKey);
  cookieStore.delete("pending_2fa");
  cookieStore.delete("pending_2fa_email");

  await issueSession({
    user: { ...user, agencyId: user.agencyId ?? null, agencySlug: user.agency?.slug ?? null },
    ip,
    userAgent,
  });
  redirect(getRoleDashboard(user.role));
}

// ── Cancel 2FA and return to Login ───────────────────────────────────────────
export async function cancel2FALoginAction() {
  const cookieStore = await cookies();
  cookieStore.delete("pending_2fa");
  cookieStore.delete("pending_2fa_email");
  return { success: true };
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
