"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "LEAVE_REQUEST"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "SALARY_REQUEST"
  | "SALARY_APPROVED"
  | "SALARY_REJECTED"
  | "LOW_STOCK"
  | "VEHICLE_RENEWAL"
  | "DAILY_SUMMARY"
  | "COMPLAINT_RAISED"
  | "COMPLAINT_RESOLVED"
  | "PAYMENT_RECEIVED";

// ── Internal helper: called from other server actions ────────────────────────
export async function createNotification({
  agencyId,
  userId,
  type,
  title,
  body,
  link,
}: {
  agencyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: { agencyId, userId, type, title, body, link: link ?? null },
    });
  } catch {
    // Silently fail — notifications are non-critical
  }
}

// ── Fetch notifications for current user ────────────────────────────────────
export async function getMyNotifications() {
  const session = await getSession();
  if (!session || !session.agencyId) return { notifications: [], unreadCount: 0 };

  const notifications = await prisma.notification.findMany({
    where: { agencyId: session.agencyId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return { notifications, unreadCount };
}

// ── Mark single notification as read ────────────────────────────────────────
export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Mark all as read ─────────────────────────────────────────────────────────
export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  await prisma.notification.updateMany({
    where: { userId: session.userId, agencyId: session.agencyId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Notify all admins in an agency ──────────────────────────────────────────
export async function notifyAdmins({
  agencyId,
  type,
  title,
  body,
  link,
}: {
  agencyId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { agencyId, role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      agencyId,
      userId: a.id,
      type,
      title,
      body,
      link: link ?? null,
    })),
  });
}
