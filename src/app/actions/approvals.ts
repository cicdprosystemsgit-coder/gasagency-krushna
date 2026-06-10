"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function submitDailySummary(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const summaryData = JSON.parse(formData.get("summaryData") as string);
  const summary = await prisma.dailySummary.create({
    data: {
      date: new Date(formData.get("date") as string),
      submittedById: session.userId,
      summaryData,
      agencyId: session.agencyId,
      status: "PENDING",
    },
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

  await prisma.dailySummary.update({
    where: { id, agencyId: session.agencyId },
    data: updateData,
  });
  return { success: true };
}
