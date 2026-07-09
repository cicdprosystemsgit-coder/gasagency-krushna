"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createDeliveryRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  const deliveredQty = Number(formData.get("deliveredQty"));
  const paymentMode = (formData.get("paymentMode") as string) || "CASH";
  const cashCollected = Number(formData.get("cashCollected")) || 0;

  if (!customerId || !productId) return { error: "Customer and product required" };
  if (!deliveredQty || deliveredQty <= 0) return { error: "Delivered quantity must be at least 1" };

  // ── Compute credit amount when paymentMode is CREDIT ─────────────────────
  // Priority: cashCollected (entered by delivery boy) → product saleRate × qty → 0
  let creditAmount = 0;
  if (paymentMode === "CREDIT") {
    if (cashCollected > 0) {
      // Delivery boy entered the credit value in the "Cash Collected" field
      creditAmount = cashCollected;
    } else {
      // Fall back to product's configured sale rate × cylinders delivered
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { saleRate: true },
      });
      creditAmount = product && product.saleRate > 0
        ? product.saleRate * deliveredQty
        : 0;
    }
  }

  // ── Transactionally create delivery + optional credit ledger entry ────────
  const [delivery] = await prisma.$transaction(async (tx) => {
    const d = await tx.deliveryRecord.create({
      data: {
        customerId,
        productId,
        deliveredQty,
        returnedQty: Number(formData.get("returnedQty")) || 0,
        pendingQty: Number(formData.get("pendingQty")) || 0,
        // For CREDIT deliveries, cashCollected = 0 (money not yet received)
        cashCollected: paymentMode === "CREDIT" ? 0 : cashCollected,
        notes: (formData.get("notes") as string) || null,
        date: new Date(formData.get("date") as string),
        deliveredById: session.userId,
        agencyId: session.agencyId!,
        status: "DELIVERED",
      },
      include: {
        customer: { select: { name: true, phone: true, address: true, type: true } },
        product: { select: { name: true, saleRate: true } },
      },
    });

    // Auto-create a Credit Ledger entry when payment is on credit
    // Use product saleRate if creditAmount is still 0 (delivery boy left cash field empty)
    const finalCreditAmount = creditAmount > 0
      ? creditAmount
      : (d.product.saleRate > 0 ? d.product.saleRate * deliveredQty : 0);

    if (paymentMode === "CREDIT" && finalCreditAmount > 0) {
      await tx.creditLedgerEntry.create({
        data: {
          customerId,
          type: "CREDIT",
          amount: finalCreditAmount,
          description: `Cylinder delivery — ${d.product.name} × ${deliveredQty} [${d.customer.type}] (Udhari / Credit pending)`,
          date: new Date(formData.get("date") as string),
          addedById: session.userId,
          agencyId: session.agencyId!,
        },
      });
    }

    return [d];
  });

  // Always bust cache when payment mode is CREDIT
  if (paymentMode === "CREDIT") {
    revalidatePath("/admin/credit-ledger");
    revalidatePath("/manager/credit-ledger");
  }

  return { delivery };
}
