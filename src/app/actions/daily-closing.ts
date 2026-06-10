"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createDailyClosing(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { error: "Unauthorized" };

  const totalDeliveries = Number(formData.get("totalDeliveries"));
  if (!totalDeliveries && totalDeliveries !== 0) return { error: "Total deliveries required" };

  const closing = await prisma.dailyClosing.create({
    data: {
      date: new Date(formData.get("date") as string),
      totalDeliveries,
      totalCollection: Number(formData.get("totalCollection")) || 0,
      pendingDeliveries: Number(formData.get("pendingDeliveries")) || 0,
      returnedCylinders: Number(formData.get("returnedCylinders")) || 0,
      cashOnHand: Number(formData.get("cashOnHand")) || 0,
      notes: (formData.get("notes") as string) || null,
      agencyId: session.agencyId,
      status: "PENDING",
    },
  });
  return { closing };
}

export async function approveDailyClosing(id: string, role: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  const data =
    role === "ADMIN"
      ? { status: "APPROVED" as const, adminApprovedAt: new Date() }
      : { status: "APPROVED" as const, managerApprovedAt: new Date() };

  await prisma.dailyClosing.update({ where: { id, agencyId: session.agencyId }, data });
  return { success: true };
}
