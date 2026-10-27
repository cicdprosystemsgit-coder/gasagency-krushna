"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateTOTPSecret, verifyTOTP, generateBackupCodes, hashBackupCode, checkBackupCode } from "@/lib/totp";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── Step 1: Initiate 2FA setup — returns secret + QR URI ─────────────────────
export async function initiate2FASetup() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) return { error: "User not found" };
  if (user.twoFactorEnabled) return { error: "2FA is already enabled" };

  const { secret, uri } = generateTOTPSecret(user.email);

  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorSecret: secret },
  });

  return { secret, uri };
}

// ── Step 2: Confirm 2FA — verify token, flip enabled, store hashed backup codes
export async function confirm2FASetup(token: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const schema = z.string().length(6, "Token must be 6 digits").regex(/^\d+$/);
  const parsed = schema.safeParse(token);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid token" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user?.twoFactorSecret) return { error: "Run initiate setup first" };
  if (user.twoFactorEnabled) return { error: "2FA already active" };

  const valid = verifyTOTP(user.twoFactorSecret, token);
  if (!valid) return { error: "Invalid code — check your authenticator app" };

  const backupCodes = generateBackupCodes();
  const hashes = await Promise.all(backupCodes.map(hashBackupCode));

  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: hashes },
  });

  revalidatePath("/admin/security");
  return { success: true, backupCodes };
}

// ── Verify 2FA token (called during login second step) ───────────────────────
export async function verify2FAToken(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return { valid: true };
  }

  const valid = verifyTOTP(user.twoFactorSecret, token);
  return { valid };
}

// ── Verify backup code during login (consumes the code) ──────────────────────
export async function verifyBackupCode(userId: string, raw: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
  });

  if (!user?.twoFactorEnabled) return { valid: true };

  const matchedHash = await checkBackupCode(raw, user.twoFactorBackupCodes);
  if (!matchedHash) return { valid: false };

  // Consume the backup code — remove it so it can't be reused
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h) => h !== matchedHash) },
  });

  return { valid: true };
}

// ── Disable 2FA (requires valid token from the user's authenticator) ────────
export async function disable2FA(token: string) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) return { error: "2FA is not enabled" };
  if (!user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, token.trim())) {
    return { error: "Invalid 6-digit code. Please enter the current code from your authenticator app." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });

  revalidatePath("/admin/security");
  return { success: true };
}

// ── Get 2FA status for the current session user ───────────────────────────────
import bcrypt from "bcryptjs";

// ── Get 2FA & PIN status for the current session user ─────────────────────────
export async function get2FAStatus() {
  const session = await getSession();
  if (!session || !session.userId) return { enabled: false, email: "", name: "", hasPin: false, backupCodesRemaining: 0 };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, twoFactorEnabled: true, twoFactorBackupCodes: true, loginPin: true },
  });

  return {
    enabled: user?.twoFactorEnabled ?? false,
    email: user?.email ?? "",
    name: user?.name ?? "",
    hasPin: Boolean(user?.loginPin),
    backupCodesRemaining: user?.twoFactorBackupCodes.length ?? 0,
  };
}

// ── Self-Service: Set or update own Login PIN (4 to 6 numbers only) ───────────
export async function setUserLoginPin(pin: string) {
  const session = await getSession();
  if (!session || !session.userId) return { error: "Unauthorized" };

  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { error: "Security PIN must be between 4 and 6 numbers only." };
  }

  const hashed = await bcrypt.hash(cleanPin, 10);
  await prisma.user.update({
    where: { id: session.userId },
    data: { loginPin: hashed },
  });

  revalidatePath("/admin/security");
  return { success: true, message: "Security PIN saved successfully! You can now use it to sign in." };
}

// ── Admin Override: Reset 2FA for an employee who lost their device ───────────
export async function adminResetUser2FA(targetUserId: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "SYSTEM_ADMIN"].includes(session.role)) {
    return { error: "Unauthorized: Only Admins can reset user 2FA." };
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      ...(session.role !== "SYSTEM_ADMIN" && session.agencyId ? { agencyId: session.agencyId } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  if (!targetUser) {
    return { error: "User not found or does not belong to your agency." };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/security");
  return { success: true, message: `Two-Factor Authentication was reset for ${targetUser.name || targetUser.email}.` };
}
