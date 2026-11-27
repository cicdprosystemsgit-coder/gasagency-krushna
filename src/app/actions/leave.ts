"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { LeaveType, LeaveStatus } from "@/generated/prisma";
import { notifyLeaveSubmitted, notifyLeaveReviewed } from "@/app/actions/notifications";

export async function applyForLeave(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  if (!data.reason.trim()) return { error: "Reason is required" };
  if (data.totalDays <= 0) return { error: "Invalid leave duration" };

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end < start) return { error: "End date cannot be before start date" };

  // Check for overlapping pending/approved leave
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: session.userId,
      agencyId: session.agencyId,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
  });
  if (overlap) return { error: "You already have a leave request overlapping these dates" };

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: session.userId,
      leaveType: data.leaveType as LeaveType,
      startDate: start,
      endDate: end,
      totalDays: data.totalDays,
      reason: data.reason.trim(),
      agencyId: session.agencyId,
    },
    include: {
      reviewedBy: { select: { name: true } },
    },
  });

  await notifyLeaveSubmitted({
    agencyId: session.agencyId,
    employeeName: session.name || "An employee",
    leaveType: data.leaveType,
    startDate: start,
    totalDays: data.totalDays,
  });

  revalidatePath("/admin/leave-management");
  revalidatePath("/manager/leave-management");
  return { leave };
}

export async function cancelLeave(id: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const leave = await prisma.leaveRequest.findFirst({
    where: { id, employeeId: session.userId, agencyId: session.agencyId, status: "PENDING" },
  });
  if (!leave) return { error: "Leave not found or cannot be cancelled" };

  await prisma.leaveRequest.delete({ where: { id } });

  revalidatePath("/admin/leave-management");
  revalidatePath("/manager/leave-management");
  return { success: true };
}

export async function reviewLeave(
  id: string,
  action: "APPROVED" | "REJECTED",
  note?: string
) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }
  if (action === "REJECTED" && !note?.trim()) {
    return { error: "Rejection reason is required" };
  }

  const leave = await prisma.leaveRequest.update({
    where: { id, agencyId: session.agencyId },
    data: {
      status: action as LeaveStatus,
      reviewNote: note?.trim() ?? null,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
    include: {
      employee: { select: { id: true, name: true, role: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  await notifyLeaveReviewed({
    agencyId: session.agencyId,
    employeeId: leave.employee.id,
    employeeRole: leave.employee.role,
    action,
    startDate: leave.startDate,
    totalDays: leave.totalDays,
    reviewNote: note,
    reviewerName: leave.reviewedBy?.name ?? session.name,
  });

  revalidatePath("/admin/leave-management");
  revalidatePath("/manager/leave-management");
  return { leave };
}

export async function bulkReviewLeaves(
  ids: string[],
  action: "APPROVED" | "REJECTED",
  note?: string
) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { id: { in: ids }, agencyId: session.agencyId, status: "PENDING" },
    select: {
      startDate: true,
      totalDays: true,
      employee: { select: { id: true, role: true } },
    },
  });

  await prisma.leaveRequest.updateMany({
    where: { id: { in: ids }, agencyId: session.agencyId, status: "PENDING" },
    data: {
      status: action as LeaveStatus,
      reviewNote: note?.trim() ?? null,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  await Promise.all(
    pendingLeaves.map((l) =>
      notifyLeaveReviewed({
        agencyId: session.agencyId!,
        employeeId: l.employee.id,
        employeeRole: l.employee.role,
        action,
        startDate: l.startDate,
        totalDays: l.totalDays,
        reviewNote: note,
        reviewerName: session.name,
      })
    )
  );

  revalidatePath("/admin/leave-management");
  revalidatePath("/manager/leave-management");
  return { success: true, count: ids.length };
}
