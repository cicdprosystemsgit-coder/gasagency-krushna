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
  // paymentMode can be: CASH | CREDIT | PARTIAL | PhonePe | GPay | Paytm | Others | <custom>
  const paymentMode = (formData.get("paymentMode") as string) || "CASH";
  const cashCollectedRaw = Number(formData.get("cashCollected")) || 0;
  const creditAmountRaw = Number(formData.get("creditAmount")) || 0;
  // partialCollectionMode: how the cash part of a PARTIAL payment was collected
  const partialCollectionMode = (formData.get("partialCollectionMode") as string) || "CASH";

  if (!customerId || !productId) return { error: "Customer and product required" };
  if (!deliveredQty || deliveredQty <= 0) return { error: "Delivered quantity must be at least 1" };

  // ── Resolve effective cash / credit amounts per payment mode ──────────────
  let effectiveCash = 0;
  let effectiveCredit = 0;

  if (paymentMode === "CREDIT") {
    // Full credit — fetch product rate to derive credit amount if not provided
    effectiveCash = 0;
    if (cashCollectedRaw > 0) {
      // Delivery boy manually typed the credit value in the cash field
      effectiveCredit = cashCollectedRaw;
    } else if (creditAmountRaw > 0) {
      effectiveCredit = creditAmountRaw;
    } else {
      // Fall back to product saleRate × qty
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { saleRate: true },
      });
      effectiveCredit = product && product.saleRate > 0 ? product.saleRate * deliveredQty : 0;
    }
  } else if (paymentMode === "PARTIAL") {
    // Split payment: some cash collected + some on credit
    effectiveCash = cashCollectedRaw;
    effectiveCredit = creditAmountRaw;
    // If credit part not provided, try to derive from product rate minus cash
    if (effectiveCredit <= 0) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { saleRate: true },
      });
      const totalValue = product && product.saleRate > 0 ? product.saleRate * deliveredQty : 0;
      effectiveCredit = Math.max(0, totalValue - effectiveCash);
    }
  } else {
    // CASH / PhonePe / GPay / Paytm / Others — full payment received
    effectiveCash = cashCollectedRaw;
    effectiveCredit = 0;
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
        cashCollected: effectiveCash,
        paymentMode,
        creditAmount: effectiveCredit,
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

    // Auto-create a Credit Ledger entry for CREDIT or PARTIAL modes (only for COMMERCIAL customers in case of PARTIAL)
    const isCommercial = d.customer.type === "COMMERCIAL";
    const shouldCreateCreditEntry = paymentMode === "CREDIT" || (paymentMode === "PARTIAL" && isCommercial);

    if (shouldCreateCreditEntry && effectiveCredit > 0) {
      const cashVia = paymentMode === "PARTIAL" ? ` via ${partialCollectionMode}` : "";
      await tx.creditLedgerEntry.create({
        data: {
          customerId,
          type: "CREDIT",
          amount: effectiveCredit,
          description:
            paymentMode === "PARTIAL"
              ? `Partial payment — ${d.product.name} × ${deliveredQty} [${d.customer.type}] — Cash ₹${effectiveCash.toFixed(0)}${cashVia}, Credit ₹${effectiveCredit.toFixed(0)}`
              : `Cylinder delivery — ${d.product.name} × ${deliveredQty} [${d.customer.type}] (Full Credit / Udhari)`,
          date: new Date(formData.get("date") as string),
          addedById: session.userId,
          agencyId: session.agencyId!,
        },
      });
    }

    return [d];
  });

  // Bust cache for all credit ledger views (including delivery boy's own view)
  if (paymentMode === "CREDIT" || paymentMode === "PARTIAL") {
    revalidatePath("/admin/credit-ledger");
    revalidatePath("/manager/credit-ledger");
    revalidatePath("/staff/credit-ledger");
    revalidatePath("/delivery-boy/credit-ledger");
  }

  return { delivery };
}
