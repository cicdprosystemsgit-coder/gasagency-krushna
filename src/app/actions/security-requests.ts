"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyTOTP, checkBackupCode } from "@/lib/totp";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── 1. User: Submit Request to Admin when MFA is NOT enabled ───────────────────
export async function requestSecurityChange(
  type: "CHANGE_PASSWORD" | "CHANGE_PIN",
  userNote?: string
): Promise<{ success?: boolean; requestId?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { twoFactorEnabled: true, agencyId: true },
  });
  if (!user) return { error: "User not found" };

  // If user already has 2FA enabled, they can self-service directly with their 6-digit TOTP
  if (user.twoFactorEnabled) {
    return { error: "Two-Factor Authentication is active on your account. You can verify and update your credentials directly without admin approval." };
  }

  // Check if an existing PENDING request already exists
  const existingPending = await prisma.securityChangeRequest.findFirst({
    where: {
      userId: session.userId,
      type,
      status: "PENDING",
    },
  });

  if (existingPending) {
    return { error: `You already have a pending request for ${type === "CHANGE_PASSWORD" ? "Password" : "PIN"} change awaiting administrator approval.` };
  }

  const req = await prisma.securityChangeRequest.create({
    data: {
      userId: session.userId,
      agencyId: user.agencyId,
      type,
      status: "PENDING",
      userNote: userNote?.trim() || null,
    },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/godown-keeper/profile");
  revalidatePath("/staff/profile");
  revalidatePath("/delivery-boy/profile");
  revalidatePath("/admin/security");

  return { success: true, requestId: req.id };
}

// ── 2. User: Cancel a pending request ──────────────────────────────────────────
export async function cancelSecurityChangeRequest(requestId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const req = await prisma.securityChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.userId !== session.userId) {
    return { error: "Request not found" };
  }
  if (req.status !== "PENDING") {
    return { error: "Only pending requests can be cancelled" };
  }

  await prisma.securityChangeRequest.delete({
    where: { id: requestId },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/godown-keeper/profile");
  revalidatePath("/staff/profile");
  revalidatePath("/delivery-boy/profile");
  revalidatePath("/admin/security");

  return { success: true };
}

// ── 3. User: Instant Update With Active Google Authenticator (MFA) ─────────────
export async function updateCredentialWithMFA(params: {
  type: "CHANGE_PASSWORD" | "CHANGE_PIN";
  totpToken: string;
  newPassword?: string;
  newPin?: string;
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { type, totpToken, newPassword, newPin } = params;

  const rawToken = (totpToken ?? "").trim();
  const cleanDigits = rawToken.replace(/[\s-]/g, "");

  if (!rawToken || (cleanDigits.length !== 6 && rawToken.replace(/-/g, "").length !== 8)) {
    return { error: "Please enter your 6-digit Authenticator code (or 8-character backup code)." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return { error: "Two-Factor Authentication is not enabled on your account." };
  }

  // Check TOTP code or backup code
  let isVerified = false;
  if (cleanDigits.length === 6) {
    isVerified = verifyTOTP(user.twoFactorSecret, cleanDigits);
  }

  // If not verified with TOTP, check if it's an emergency backup code
  if (!isVerified && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
    const matchedHash = await checkBackupCode(rawToken, user.twoFactorBackupCodes);
    if (matchedHash) {
      isVerified = true;
      // Consume backup code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h) => h !== matchedHash),
        },
      });
    }
  }

  if (!isVerified) {
    return { error: "Invalid Authenticator code. Open Google Authenticator or Microsoft Authenticator and enter the current 6-digit code." };
  }

  if (type === "CHANGE_PASSWORD") {
    if (!newPassword || newPassword.length < 6) {
      return { error: "New password must be at least 6 characters long." };
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/manager/profile");
    revalidatePath("/godown-keeper/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/delivery-boy/profile");

    return { success: true, message: "Password updated successfully!" };
  }

  if (type === "CHANGE_PIN") {
    if (!newPin || !/^\d{4,6}$/.test(newPin.trim())) {
      return { error: "PIN must consist of 4 to 6 numbers only (e.g. 1234 or 582914)." };
    }
    const hashedPin = await bcrypt.hash(newPin.trim(), 10);
    await prisma.user.update({
      where: { id: session.userId },
      data: { loginPin: hashedPin },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/manager/profile");
    revalidatePath("/godown-keeper/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/delivery-boy/profile");

    return { success: true, message: "Security Login PIN updated successfully!" };
  }

  return { error: "Invalid request type" };
}

// ── 4. User: Update With Admin Approval Token ──────────────────────────────────
export async function updateCredentialWithApprovalToken(params: {
  approvalToken: string;
  newPassword?: string;
  newPin?: string;
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { approvalToken, newPassword, newPin } = params;

  const req = await prisma.securityChangeRequest.findUnique({
    where: { approvalToken },
  });

  if (!req || req.userId !== session.userId) {
    return { error: "Invalid or unauthorized approval token." };
  }

  if (req.status !== "APPROVED") {
    return { error: `This request cannot be completed (current status: ${req.status}).` };
  }

  if (req.expiresAt && req.expiresAt < new Date()) {
    await prisma.securityChangeRequest.update({
      where: { id: req.id },
      data: { status: "EXPIRED" },
    });
    return { error: "This approval has expired (valid for 24 hours). Please submit a new request." };
  }

  if (req.type === "CHANGE_PASSWORD") {
    if (!newPassword || newPassword.length < 6) {
      return { error: "New password must be at least 6 characters long." };
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      }),
      prisma.securityChangeRequest.update({
        where: { id: req.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          approvalToken: null, // Invalidate token after use
        },
      }),
    ]);
    return { success: true, message: "Password successfully changed via Administrator approval!" };
  }

  if (req.type === "CHANGE_PIN") {
    if (!newPin || !/^\d{4,6}$/.test(newPin.trim())) {
      return { error: "PIN must consist of 4 to 6 numbers only." };
    }
    const hashedPin = await bcrypt.hash(newPin.trim(), 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: { loginPin: hashedPin },
      }),
      prisma.securityChangeRequest.update({
        where: { id: req.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          approvalToken: null, // Invalidate token after use
        },
      }),
    ]);
    return { success: true, message: "Security Login PIN successfully changed via Administrator approval!" };
  }

  return { error: "Invalid request type" };
}

// ── 5. Admin: Fetch All Agency Credential Requests ────────────────────────────
export async function adminGetSecurityRequests() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { error: "Unauthorized — Admin access required" };

  const requests = await prisma.securityChangeRequest.findMany({
    where: { agencyId: session.agencyId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          twoFactorEnabled: true,
        },
      },
      reviewedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    requests: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      userPhone: r.user.phone,
      userRole: r.user.role,
      userAvatarUrl: r.user.avatarUrl,
      userHasMFA: r.user.twoFactorEnabled,
      type: r.type,
      status: r.status,
      userNote: r.userNote,
      adminResponseNote: r.adminResponseNote,
      reviewedByName: r.reviewedBy?.name || null,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

// ── 6. Admin: Approve Request ─────────────────────────────────────────────────
export async function adminApproveSecurityRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { error: "Unauthorized — Admin access required" };

  const req = await prisma.securityChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.agencyId !== session.agencyId) return { error: "Request not found" };
  if (req.status !== "PENDING") return { error: `Request is already ${req.status}` };

  const approvalToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours valid

  await prisma.securityChangeRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvalToken,
      expiresAt,
      reviewedById: session.userId,
      reviewedAt: new Date(),
      adminResponseNote: adminNote?.trim() || "Approved by administrator.",
    },
  });

  revalidatePath("/admin/security");
  revalidatePath("/admin/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/godown-keeper/profile");
  revalidatePath("/staff/profile");
  revalidatePath("/delivery-boy/profile");

  return { success: true };
}

// ── 7. Admin: Reject Request ──────────────────────────────────────────────────
export async function adminRejectSecurityRequest(
  requestId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { error: "Unauthorized — Admin access required" };

  if (!reason || reason.trim().length < 3) {
    return { error: "Please provide a reason for rejecting the request so the user is informed." };
  }

  const req = await prisma.securityChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!req || req.agencyId !== session.agencyId) return { error: "Request not found" };
  if (req.status !== "PENDING") return { error: `Request is already ${req.status}` };

  await prisma.securityChangeRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedById: session.userId,
      reviewedAt: new Date(),
      adminResponseNote: reason.trim(),
    },
  });

  revalidatePath("/admin/security");
  revalidatePath("/admin/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/godown-keeper/profile");
  revalidatePath("/staff/profile");
  revalidatePath("/delivery-boy/profile");

  return { success: true };
}
