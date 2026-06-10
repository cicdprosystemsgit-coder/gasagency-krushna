"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createCommercialSale(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  if (!customerId || !productId) return { error: "Customer and product required" };

  const sale = await prisma.commercialSale.create({
    data: {
      customerId,
      productId,
      qty: Number(formData.get("qty")),
      rate: Number(formData.get("rate")),
      amount: Number(formData.get("amount")),
      cashCollected: Number(formData.get("cashCollected")) || 0,
      udhariNew: Number(formData.get("udhariNew")) || 0,
      udhariPrev: Number(formData.get("udhariPrev")) || 0,
      balance: Number(formData.get("balance")) || 0,
      date: new Date(formData.get("date") as string),
      addedById: session.userId,
      agencyId: session.agencyId,
    },
    include: {
      customer: { select: { name: true, type: true } },
      product: { select: { name: true } },
      addedBy: { select: { name: true } },
    },
  });
  return { sale };
}

export async function deleteCommercialSale(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  await prisma.commercialSale.delete({ where: { id: formData.get("id") as string, agencyId: session.agencyId } });
  return { success: true };
}
