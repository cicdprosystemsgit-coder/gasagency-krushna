"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma";
import { sanitizeNotificationLink, getRoleDashboardPrefix } from "@/lib/notification-link";

// ── Types ────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "LEAVE_REQUEST"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "SALARY_REQUEST"
  | "SALARY_APPROVED"
  | "SALARY_REJECTED"
  | "DELIVERY_REQUEST"
  | "DELIVERY_APPROVED"
  | "DELIVERY_REJECTED"
  | "DELIVERY_FULFILLED"
  | "EXPENSE_REQUEST"
  | "EXPENSE_APPROVED"
  | "EXPENSE_REJECTED"
  | "ATTENDANCE_REGULARIZATION"
  | "ATTENDANCE_REGULARIZATION_STATUS"
  | "LOW_STOCK"
  | "VEHICLE_RENEWAL"
  | "DAILY_SUMMARY"
  | "DAILY_SUMMARY_REVIEWED"
  | "COMPLAINT_RAISED"
  | "COMPLAINT_RESOLVED"
  | "PAYMENT_RECEIVED"
  | "SYSTEM_WELCOME";

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

  const rawNotifications = await prisma.notification.findMany({
    where: { agencyId: session.agencyId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const notifications = await Promise.all(
    rawNotifications.map(async (n) => ({
      ...n,
      link: await sanitizeNotificationLink(n.link, session.userId, session.role),
    }))
  );

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

// ── Notify Admins & Managers when an employee applies for leave ─────────────
export async function notifyLeaveSubmitted({
  agencyId,
  employeeName,
  leaveType,
  startDate,
  totalDays,
}: {
  agencyId: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  totalDays: number;
}) {
  try {
    const reviewers = await prisma.user.findMany({
      where: { agencyId, role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
      select: { id: true, role: true },
    });
    if (reviewers.length === 0) return;

    const dateStr = startDate.toISOString().split("T")[0];
    const readableType = leaveType.replace(/_/g, " ").toLowerCase();

    await prisma.notification.createMany({
      data: reviewers.map((r) => {
        const prefix = getRoleDashboardPrefix(r.role);
        return {
          agencyId,
          userId: r.id,
          type: "LEAVE_REQUEST",
          title: "New Leave Request",
          body: `${employeeName} applied for ${totalDays} day(s) of ${readableType} starting ${dateStr}.`,
          link: prefix ? `${prefix}/approvals?tab=leave` : null,
        };
      }),
    });
  } catch {
    // Non-critical
  }
}

// ── Notify employee when their leave request is approved or rejected ────────
export async function notifyLeaveReviewed({
  agencyId,
  employeeId,
  employeeRole,
  action,
  startDate,
  totalDays,
  reviewNote,
  reviewerName,
}: {
  agencyId: string;
  employeeId: string;
  employeeRole: string;
  action: "APPROVED" | "REJECTED";
  startDate: Date;
  totalDays: number;
  reviewNote?: string | null;
  reviewerName?: string | null;
}) {
  try {
    const prefix = getRoleDashboardPrefix(employeeRole);
    const dateStr = startDate.toISOString().split("T")[0];
    const isApproved = action === "APPROVED";
    const byText = reviewerName ? ` by ${reviewerName}` : "";
    const reasonText =
      !isApproved && reviewNote?.trim() ? ` Reason: ${reviewNote.trim()}` : "";

    await prisma.notification.create({
      data: {
        agencyId,
        userId: employeeId,
        type: isApproved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        title: isApproved ? "Leave Request Approved" : "Leave Request Rejected",
        body: `Your ${totalDays} day(s) leave request from ${dateStr} was ${action.toLowerCase()}${byText}.${reasonText}`,
        link: prefix ? `${prefix}/leave-management` : null,
      },
    });
  } catch {
    // Non-critical
  }
}

// ── Notify specific roles with role-prefixed links ───────────────────────────
export async function notifyRolesWithLink({
  agencyId,
  roles,
  type,
  title,
  body,
  subPath,
  excludeUserId,
}: {
  agencyId: string;
  roles: Role[];
  type: NotificationType;
  title: string;
  body: string;
  subPath: string;
  excludeUserId?: string;
}) {
  try {
    const users = await prisma.user.findMany({
      where: {
        agencyId,
        role: { in: roles },
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, role: true },
    });
    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map((u) => {
        const prefix = getRoleDashboardPrefix(u.role);
        return {
          agencyId,
          userId: u.id,
          type,
          title,
          body,
          link: prefix ? `${prefix}${subPath}` : null,
        };
      }),
    });
  } catch {
    // Non-critical
  }
}

// ── Notify a single user with a role-prefixed link ───────────────────────────
export async function notifyUserWithRoleLink({
  agencyId,
  userId,
  userRole,
  type,
  title,
  body,
  subPath,
}: {
  agencyId: string;
  userId: string;
  userRole: string;
  type: NotificationType;
  title: string;
  body: string;
  subPath: string;
}) {
  try {
    const prefix = getRoleDashboardPrefix(userRole);
    await prisma.notification.create({
      data: {
        agencyId,
        userId,
        type,
        title,
        body,
        link: prefix ? `${prefix}${subPath}` : null,
      },
    });
  } catch {
    // Non-critical
  }
}
