"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Generate unique receipt number ───────────────────────────────────────────
async function generateReceiptNo(agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.paymentReceipt.count({
    where: { agencyId },
  });
  return `RCP-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ── Create payment receipt ───────────────────────────────────────────────────
export async function createPaymentReceipt(data: {
  customerId: string;
  amount: number;
  paymentMode: string;
  utrNo?: string;
  date: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };
  if (!data.customerId) return { error: "Customer is required" };
  if (!data.amount || data.amount <= 0) return { error: "Valid amount is required" };
  if (!data.paymentMode) return { error: "Payment mode is required" };

  const receiptNo = await generateReceiptNo(session.agencyId);

  const receipt = await prisma.paymentReceipt.create({
    data: {
      agencyId: session.agencyId,
      customerId: data.customerId,
      amount: data.amount,
      paymentMode: data.paymentMode,
      utrNo: data.utrNo?.trim() || null,
      receiptNo,
      collectedById: session.userId,
      date: new Date(data.date),
      notes: data.notes?.trim() || null,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      collectedBy: { select: { name: true } },
    },
  });

  revalidatePath("/admin/payment-receipts");
  return { receipt };
}

// ── Get all receipts ─────────────────────────────────────────────────────────
export async function getPaymentReceipts(filters?: {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
  limit?: number;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { receipts: [] };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  if (filters?.customerId) where.customerId = filters.customerId;
  if (filters?.paymentMode) where.paymentMode = filters.paymentMode;
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo + "T23:59:59") } : {}),
    };
  }

  const receipts = await prisma.paymentReceipt.findMany({
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      collectedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });

  return { receipts };
}

// ── Get daily cash reconciliation ────────────────────────────────────────────
export async function getDailyCashReconciliation(date?: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized", data: null };
  }

  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const [receipts, deliveries] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { agencyId: session.agencyId, date: { gte: start, lte: end } },
      include: { customer: { select: { name: true } } },
    }),
    prisma.deliveryRecord.findMany({
      where: { agencyId: session.agencyId, date: { gte: start, lte: end } },
      select: { cashCollected: true },
    }),
  ]);

  const expectedFromDeliveries = deliveries.reduce((s, d) => s + d.cashCollected, 0);
  const actualReceiptsTotal = receipts.reduce((s, r) => s + r.amount, 0);
  const byMode = receipts.reduce((acc, r) => {
    acc[r.paymentMode] = (acc[r.paymentMode] ?? 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    data: {
      date: start.toISOString().split("T")[0],
      expectedFromDeliveries: Math.round(expectedFromDeliveries),
      actualReceipted: Math.round(actualReceiptsTotal),
      variance: Math.round(actualReceiptsTotal - expectedFromDeliveries),
      receiptCount: receipts.length,
      byMode,
      receipts,
    },
  };
}

// ── Delete a receipt ─────────────────────────────────────────────────────────
export async function deletePaymentReceipt(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  await prisma.paymentReceipt.delete({
    where: { id, agencyId: session.agencyId },
  });

  revalidatePath("/admin/payment-receipts");
  return { success: true };
}
