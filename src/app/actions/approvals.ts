"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notifyRolesWithLink, notifyUserWithRoleLink } from "@/app/actions/notifications";

export async function submitDailySummary(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const summaryData = JSON.parse(formData.get("summaryData") as string);
  const dateStr = formData.get("date") as string;
  const summary = await prisma.dailySummary.create({
    data: {
      date: new Date(dateStr),
      submittedById: session.userId,
      summaryData,
      agencyId: session.agencyId,
      status: "PENDING",
    },
  });

  await notifyRolesWithLink({
    agencyId: session.agencyId,
    roles: ["ADMIN", "MANAGER"],
    type: "DAILY_SUMMARY",
    title: "Daily Summary Submitted",
    body: `${session.name || "An employee"} submitted daily closing summary for ${dateStr}.`,
    subPath: "/approvals?tab=daily",
    excludeUserId: session.userId,
  });

  return { summary };
}

export async function approveOrRejectSummary(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  const id = formData.get("id") as string;
  const action = formData.get("action") as string;
  const note = (formData.get("note") as string) || null;

  let updateData: Record<string, unknown> = {};

  if (action === "MANAGER_APPROVE") {
    updateData = { status: "APPROVED", approvedByManagerId: session.userId, managerApprovedAt: new Date() };
  } else if (action === "ADMIN_APPROVE") {
    updateData = { status: "APPROVED", approvedByAdminId: session.userId, adminApprovedAt: new Date() };
  } else if (action === "REJECT") {
    updateData = { status: "REJECTED", managerNote: note };
  } else if (action === "CORRECTION_NEEDED") {
    updateData = { status: "CORRECTION_NEEDED" };
  }

  const updated = await prisma.dailySummary.update({
    where: { id, agencyId: session.agencyId },
    data: updateData,
    include: {
      submittedBy: { select: { id: true, role: true } },
    },
  });

  const dateStr = updated.date.toISOString().split("T")[0];
  const statusLabel =
    action === "REJECT"
      ? "rejected"
      : action === "CORRECTION_NEEDED"
      ? "marked for correction"
      : "approved";

  await notifyUserWithRoleLink({
    agencyId: session.agencyId,
    userId: updated.submittedBy.id,
    userRole: updated.submittedBy.role,
    type: "DAILY_SUMMARY_REVIEWED",
    title: `Daily Summary ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
    body: `Your daily closing summary for ${dateStr} was ${statusLabel} by ${session.name || session.role}.${note ? ` Note: ${note}` : ""}`,
    subPath: ["ADMIN", "MANAGER"].includes(updated.submittedBy.role)
      ? "/approvals?tab=daily"
      : "/daily-closing",
  });

  return { success: true };
}
