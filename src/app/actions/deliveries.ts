"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createDeliveryRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  const deliveredQty = Number(formData.get("deliveredQty"));

  if (!customerId || !productId) return { error: "Customer and product required" };
  if (!deliveredQty || deliveredQty <= 0) return { error: "Delivered quantity must be at least 1" };

  const delivery = await prisma.deliveryRecord.create({
    data: {
      customerId,
      productId,
      deliveredQty,
      returnedQty: Number(formData.get("returnedQty")) || 0,
      pendingQty: Number(formData.get("pendingQty")) || 0,
      cashCollected: Number(formData.get("cashCollected")) || 0,
      notes: (formData.get("notes") as string) || null,
      date: new Date(formData.get("date") as string),
      deliveredById: session.userId,
      agencyId: session.agencyId,
      status: "DELIVERED",
    },
    include: {
      customer: { select: { name: true, phone: true, address: true } },
      product: { select: { name: true } },
    },
  });
  return { delivery };
}
