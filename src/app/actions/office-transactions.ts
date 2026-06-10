"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type TransactionType, type PaymentMode } from "@/generated/prisma";

export async function createOfficeTransaction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const unitRate = Number(formData.get("unitRate"));
  if (!unitRate || unitRate <= 0) return { error: "Valid rate required" };

  const inventoryId = (formData.get("inventoryId") as string) || null;

  const transaction = await prisma.officeTransaction.create({
    data: {
      type: (formData.get("type") as TransactionType) || "OTHER",
      inventoryId: inventoryId || null,
      description: (formData.get("description") as string) || null,
      qty: Number(formData.get("qty")) || 1,
      unitRate,
      amount: Number(formData.get("amount")) || unitRate,
      paymentMode: (formData.get("paymentMode") as PaymentMode) || "CASH",
      remarks: (formData.get("remarks") as string) || null,
      date: new Date(formData.get("date") as string),
      addedById: session.userId,
      agencyId: session.agencyId,
    },
    include: {
      product: { select: { name: true } },
      addedBy: { select: { name: true } },
    },
  });
  return { transaction };
}

export async function deleteOfficeTransaction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  await prisma.officeTransaction.delete({
    where: { id: formData.get("id") as string, agencyId: session.agencyId },
  });
  return { success: true };
}
