"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type TransactionType, type PaymentMode } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function verifyRegulatorNumber(regulatorNo: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const record = await prisma.regulatorRecord.findFirst({
    where: {
      regulatorNo: regulatorNo.trim(),
      agencyId: session.agencyId,
      status: "ISSUED",
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, customerCode: true } },
    },
  });

  if (!record) {
    return { error: "Regulator serial number not found or not currently active." };
  }

  return { record };
}

export async function createOfficeTransaction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const unitRate = Number(formData.get("unitRate"));
  if (!unitRate || unitRate <= 0) return { error: "Valid rate required" };

  const type = (formData.get("type") as TransactionType) || "OTHER";
  const customerId = (formData.get("customerId") as string) || null;
  const inventoryId = (formData.get("inventoryId") as string) || null;
  const requestedQty = Number(formData.get("qty")) || 1;

  const regulatorNo = (formData.get("regulatorNo") as string)?.trim() || null;
  const oldRegulatorNo = (formData.get("oldRegulatorNo") as string)?.trim() || null;
  const newRegulatorNo = (formData.get("newRegulatorNo") as string)?.trim() || null;

  // ── Regulator Validation Checks ──────────────────────────────────────────
  if (type === "REGULATOR" || type === "REGULATOR_REPLACE") {
    if (!customerId) {
      return { error: "Customer selection is mandatory for Regulator transactions." };
    }
  }

  if (type === "REGULATOR") {
    if (!regulatorNo) return { error: "Regulator Serial Number is required." };
    const existing = await prisma.regulatorRecord.findFirst({
      where: { regulatorNo, agencyId: session.agencyId, status: "ISSUED" },
    });
    if (existing) {
      return { error: `Regulator #${regulatorNo} is already registered as active/issued in the system.` };
    }
  }

  if (type === "REGULATOR_REPLACE") {
    if (!oldRegulatorNo) return { error: "Returned (Old) Regulator Serial Number is required." };
    if (!newRegulatorNo) return { error: "New Regulator Serial Number is required." };

    const oldRecord = await prisma.regulatorRecord.findFirst({
      where: { regulatorNo: oldRegulatorNo, agencyId: session.agencyId, status: "ISSUED" },
    });
    if (!oldRecord) {
      return { error: `Returned Regulator #${oldRegulatorNo} was not found in active system records.` };
    }

    const existingNew = await prisma.regulatorRecord.findFirst({
      where: { regulatorNo: newRegulatorNo, agencyId: session.agencyId, status: "ISSUED" },
    });
    if (existingNew) {
      return { error: `New Regulator #${newRegulatorNo} is already active/issued in the system.` };
    }
  }

  // ── Office stock check when a product is linked ───────────────────────────
  if (inventoryId) {
    const latestStockRecord = await prisma.stockRecord.findFirst({
      where: { agencyId: session.agencyId, productId: inventoryId },
      orderBy: { date: "desc" },
    });
    const officeStock = latestStockRecord?.closingStock ?? 0;

    if (requestedQty > officeStock) {
      const product = await prisma.product.findUnique({
        where: { id: inventoryId },
        select: { name: true },
      });
      return {
        error: `Insufficient office stock for "${product?.name ?? "selected product"}". Requested: ${requestedQty}, Available in office: ${officeStock}.`,
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  let autoDescription = (formData.get("description") as string) || null;
  if (type === "REGULATOR" && regulatorNo) {
    autoDescription = `Regulator Issued (S/N: ${regulatorNo})${autoDescription ? ` - ${autoDescription}` : ""}`;
  } else if (type === "REGULATOR_REPLACE" && oldRegulatorNo && newRegulatorNo) {
    autoDescription = `Regulator Replacement (Old: ${oldRegulatorNo} ➔ New: ${newRegulatorNo})${autoDescription ? ` - ${autoDescription}` : ""}`;
  }

  const transaction = await prisma.officeTransaction.create({
    data: {
      type,
      inventoryId: inventoryId || null,
      description: autoDescription,
      qty: Number(formData.get("qty")) || 1,
      unitRate,
      amount: Number(formData.get("amount")) || unitRate,
      paymentMode: (formData.get("paymentMode") as PaymentMode) || "CASH",
      remarks: (formData.get("remarks") as string) || null,
      date: new Date(formData.get("date") as string),
      addedById: session.userId,
      agencyId: session.agencyId,
      customerId,
    },
    include: {
      product: { select: { name: true } },
      addedBy: { select: { name: true } },
      customer: { select: { name: true, phone: true } },
    },
  });

  // ── Create Regulator Records ─────────────────────────────────────────────
  if (type === "REGULATOR" && regulatorNo && customerId) {
    await prisma.regulatorRecord.create({
      data: {
        regulatorNo,
        status: "ISSUED",
        issuedAt: transaction.date,
        customerId,
        officeTransactionId: transaction.id,
        agencyId: session.agencyId,
        notes: `New regulator issuance via Office Transaction`,
      },
    });
  }

  if (type === "REGULATOR_REPLACE" && oldRegulatorNo && newRegulatorNo && customerId) {
    const oldRecord = await prisma.regulatorRecord.findFirst({
      where: { regulatorNo: oldRegulatorNo, agencyId: session.agencyId, status: "ISSUED" },
    });

    if (oldRecord) {
      const newRecord = await prisma.regulatorRecord.create({
        data: {
          regulatorNo: newRegulatorNo,
          status: "ISSUED",
          issuedAt: transaction.date,
          customerId,
          officeTransactionId: transaction.id,
          replacesId: oldRecord.id,
          agencyId: session.agencyId,
          notes: `Replacement regulator issued (Replaces #${oldRegulatorNo})`,
        },
      });

      await prisma.regulatorRecord.update({
        where: { id: oldRecord.id },
        data: {
          status: "REPLACED",
          replacedById: newRecord.id,
        },
      });
    }
  }

  // ── Create Credit Entry if Payment Mode is CREDIT ─────────────────────────
  if (transaction.paymentMode === "CREDIT" && transaction.customerId) {
    await prisma.creditLedgerEntry.create({
      data: {
        date: transaction.date,
        customerId: transaction.customerId,
        type: "CREDIT",
        amount: transaction.amount,
        description: `Office Transaction: ${transaction.product?.name ?? transaction.description ?? "Other Sale"}${transaction.remarks ? ` - ${transaction.remarks}` : ""}`,
        addedById: session.userId,
        agencyId: session.agencyId,
        officeTransactionId: transaction.id,
      },
    });
  }

  revalidatePath("/admin/credit-ledger");
  revalidatePath("/manager/credit-ledger");
  revalidatePath("/staff/credit-ledger");
  revalidatePath("/admin/regulators");
  revalidatePath("/manager/regulators");
  revalidatePath("/staff/regulators");

  return { transaction };
}

export async function deleteOfficeTransaction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  await prisma.officeTransaction.delete({
    where: { id: formData.get("id") as string, agencyId: session.agencyId },
  });

  revalidatePath("/admin/credit-ledger");
  revalidatePath("/manager/credit-ledger");
  revalidatePath("/staff/credit-ledger");
  revalidatePath("/admin/regulators");
  revalidatePath("/manager/regulators");
  revalidatePath("/staff/regulators");

  return { success: true };
}
