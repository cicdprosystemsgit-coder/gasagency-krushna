"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  uploadProfilePhotoToCloudinary,
  extractCloudinaryPublicId,
  deleteFromCloudinary,
} from "@/lib/cloudinary";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  customRole: string | null;
  avatarUrl: string | null;
  photoBase64: string | null;
  createdAt: string;
  passwordChangedAt: string | null;
  hasPin: boolean;
  twoFactorEnabled: boolean;
  bankAccountNo: string | null;
  bankName: string | null;
  ifscCode: string | null;
  agency: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  activeRequest: {
    id: string;
    type: "CHANGE_PASSWORD" | "CHANGE_PIN";
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "EXPIRED";
    userNote: string | null;
    adminResponseNote: string | null;
    approvalToken: string | null;
    expiresAt: string | null;
    createdAt: string;
  } | null;
  requestHistory: Array<{
    id: string;
    type: "CHANGE_PASSWORD" | "CHANGE_PIN";
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "EXPIRED";
    userNote: string | null;
    adminResponseNote: string | null;
    reviewedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
}

export async function getUserProfileData(): Promise<{ profile?: UserProfileData; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      agency: {
        select: { id: true, name: true, email: true, phone: true, address: true },
      },
      securityRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) return { error: "User not found" };

  // Find active request (pending or active approved within 24h or recent rejected)
  const now = new Date();
  const activeRequest = user.securityRequests.find(
    (r) =>
      r.status === "PENDING" ||
      (r.status === "APPROVED" && (!r.expiresAt || r.expiresAt > now)) ||
      (r.status === "REJECTED" && (now.getTime() - r.updatedAt.getTime()) < 3 * 24 * 60 * 60 * 1000)
  ) || null;

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      customRole: user.customRole,
      avatarUrl: user.avatarUrl,
      photoBase64: user.photoBase64,
      createdAt: user.createdAt.toISOString(),
      passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
      hasPin: Boolean(user.loginPin),
      twoFactorEnabled: user.twoFactorEnabled,
      bankAccountNo: user.bankAccountNo,
      bankName: user.bankName,
      ifscCode: user.ifscCode,
      agency: user.agency
        ? {
            id: user.agency.id,
            name: user.agency.name,
            email: user.agency.email,
            phone: user.agency.phone,
            address: user.agency.address,
          }
        : null,
      activeRequest: activeRequest
        ? {
            id: activeRequest.id,
            type: activeRequest.type,
            status: activeRequest.status,
            userNote: activeRequest.userNote,
            adminResponseNote: activeRequest.adminResponseNote,
            approvalToken: activeRequest.status === "APPROVED" ? activeRequest.approvalToken : null,
            expiresAt: activeRequest.expiresAt ? activeRequest.expiresAt.toISOString() : null,
            createdAt: activeRequest.createdAt.toISOString(),
          }
        : null,
      requestHistory: user.securityRequests.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        userNote: r.userNote,
        adminResponseNote: r.adminResponseNote,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  phone: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
});

export async function updateUserProfile(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    name: (formData.get("name") as string)?.trim(),
    phone: (formData.get("phone") as string)?.trim() || null,
    bankAccountNo: (formData.get("bankAccountNo") as string)?.trim() || null,
    bankName: (formData.get("bankName") as string)?.trim() || null,
    ifscCode: (formData.get("ifscCode") as string)?.trim() || null,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input" };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        bankAccountNo: parsed.data.bankAccountNo,
        bankName: parsed.data.bankName,
        ifscCode: parsed.data.ifscCode,
      },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/manager/profile");
    revalidatePath("/godown-keeper/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/delivery-boy/profile");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return { error: msg };
  }
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const file = formData.get("avatar") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file to upload." };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image file size exceeds the 5MB limit." };
  }

  // Valid MIME types
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowedMime.includes(file.type)) {
    return { error: "Only JPG, PNG, and WebP images are allowed." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadProfilePhotoToCloudinary(buffer, session.userId);

    // Fetch user to clean up previous Cloudinary asset if one exists
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl && currentUser.avatarUrl.includes("cloudinary.com")) {
      const oldPublicId = extractCloudinaryPublicId(currentUser.avatarUrl);
      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId).catch(() => {});
      }
    }

    // Update in database
    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: uploadResult.url },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/manager/profile");
    revalidatePath("/godown-keeper/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/delivery-boy/profile");

    return { url: uploadResult.url };
  } catch (err: unknown) {
    console.error("[uploadProfileAvatarAction] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to upload profile photo to Cloudinary";
    return { error: msg };
  }
}

export async function removeProfileAvatarAction(): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl && user.avatarUrl.includes("cloudinary.com")) {
      const publicId = extractCloudinaryPublicId(user.avatarUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: null, photoBase64: null },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/manager/profile");
    revalidatePath("/godown-keeper/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/delivery-boy/profile");

    return { success: true };
  } catch (err: unknown) {
    console.error("[removeProfileAvatarAction] Error:", err);
    return { error: "Failed to remove avatar photo" };
  }
}
