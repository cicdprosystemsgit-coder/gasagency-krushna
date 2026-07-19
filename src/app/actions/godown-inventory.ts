"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { type GodownInventory } from "@/generated/prisma";

type GodownInventoryWithProduct = GodownInventory & {
  product: { id: string; name: string };
  recordedBy: { name: string };
};

// ── Record stock received at godown from company ─────────────────────────────
export async function receiveGodownStock(
  formData: FormData
): Promise<{ record?: GodownInventoryWithProduct; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId)
    return { error: "Unauthorized" };

  const productId = formData.get("productId") as string;
  const qty = Number(formData.get("qty"));
  const date = formData.get("date") as string;

  if (!productId) return { error: "Product is required" };
  if (!qty || qty <= 0) return { error: "Quantity must be greater than 0" };

  const recordLat = formData.get("recordLat") ? Number(formData.get("recordLat")) : null;
  const recordLng = formData.get("recordLng") ? Number(formData.get("recordLng")) : null;
  const recordAccuracy = formData.get("recordAccuracy") ? Number(formData.get("recordAccuracy")) : null;

  const invoiceNo = (formData.get("invoiceNo") as string)?.trim() || null;
  const invoiceDateStr = formData.get("invoiceDate") as string;
  const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : null;

  const record = await prisma.godownInventory.create({
    data: {
      date: new Date(date || Date.now()),
      moveType: "RECEIVED",
      productId,
      qty,
      batchNo: (formData.get("batchNo") as string) || null,
      invoiceNo,
      invoiceDate,
      notes: (formData.get("notes") as string) || null,
      recordedById: session.userId,
      agencyId: session.agencyId,
      recordLat,
      recordLng,
      recordAccuracy,
    },
    include: {
      product: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  revalidatePath("/godown-keeper/godown");
  return { record: record as GodownInventoryWithProduct };
}

// ── Dispatch products from godown to agency office ───────────────────────────
export async function dispatchToOffice(
  formData: FormData
): Promise<{ record?: GodownInventoryWithProduct; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId)
    return { error: "Unauthorized" };

  const productId = formData.get("productId") as string;
  const qty = Number(formData.get("qty"));
  const date = formData.get("date") as string;

  if (!productId) return { error: "Product is required" };
  if (!qty || qty <= 0) return { error: "Quantity must be greater than 0" };

  // Validate: can't dispatch more than current stock
  const agg = await prisma.godownInventory.groupBy({
    by: ["moveType"],
    where: { agencyId: session.agencyId, productId },
    _sum: { qty: true },
  });
  const received   = agg.find(a => a.moveType === "RECEIVED")?._sum.qty ?? 0;
  const dispatched = agg.find(a => a.moveType === "DISPATCHED")?._sum.qty ?? 0;
  const available  = received - dispatched;

  if (qty > available)
    return { error: `Only ${available} units available in godown (stock: ${received}, dispatched: ${dispatched})` };

  const recordLat = formData.get("recordLat") ? Number(formData.get("recordLat")) : null;
  const recordLng = formData.get("recordLng") ? Number(formData.get("recordLng")) : null;
  const recordAccuracy = formData.get("recordAccuracy") ? Number(formData.get("recordAccuracy")) : null;

  const invoiceNo = (formData.get("invoiceNo") as string)?.trim() || null;
  const invoiceDateStr = formData.get("invoiceDate") as string;
  const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : null;

  const record = await prisma.godownInventory.create({
    data: {
      date: new Date(date || Date.now()),
      moveType: "DISPATCHED",
      productId,
      qty,
      batchNo: (formData.get("batchNo") as string) || null,
      invoiceNo,
      invoiceDate,
      notes: (formData.get("notes") as string) || null,
      recordedById: session.userId,
      agencyId: session.agencyId,
      recordLat,
      recordLng,
      recordAccuracy,
    },
    include: {
      product: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  // Also update StockRecord loadingIn for the office side
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const existing = await prisma.stockRecord.findFirst({
    where: { agencyId: session.agencyId, productId, date: { gte: dayStart } },
  });
  if (existing) {
    await prisma.stockRecord.update({
      where: { id: existing.id },
      data: { loadingIn: { increment: qty } },
    });
  } else {
    await prisma.stockRecord.create({
      data: {
        date: dayStart,
        productId,
        agencyId: session.agencyId,
        openingStock: 0,
        loadingIn: qty,
        salesQty: 0,
        returned: 0,
        closingStock: qty,
      },
    });
  }

  revalidatePath("/godown-keeper/godown");
  revalidatePath("/admin/inventory");
  revalidatePath("/manager/inventory");
  revalidatePath("/staff/office-transactions");
  return { record: record as GodownInventoryWithProduct };
}

// ── Fetch all godown inventory movements for a given agency (for admin/manager/staff) ──
export async function getGodownInventoryMovements(agencyId: string) {
  return prisma.godownInventory.findMany({
    where: { agencyId },
    orderBy: { date: "desc" },
    take: 200,
    include: {
      product: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

// ── Compute current godown stock levels per product ──────────────────────────
export async function getGodownStockLevels(agencyId: string) {
  const movements = await prisma.godownInventory.groupBy({
    by: ["productId", "moveType"],
    where: { agencyId },
    _sum: { qty: true },
  });

  const byProduct: Record<string, { received: number; dispatched: number }> = {};
  movements.forEach(m => {
    if (!byProduct[m.productId]) byProduct[m.productId] = { received: 0, dispatched: 0 };
    if (m.moveType === "RECEIVED")   byProduct[m.productId].received   += m._sum.qty ?? 0;
    if (m.moveType === "DISPATCHED") byProduct[m.productId].dispatched += m._sum.qty ?? 0;
  });

  return byProduct;
}

// ── Edit an existing movement ────────────────────────────────────────────────
export async function updateGodownMovement(
  id: string,
  formData: FormData
): Promise<{ record?: GodownInventoryWithProduct; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId)
    return { error: "Unauthorized" };

  const qty = Number(formData.get("qty"));
  if (!qty || qty <= 0) return { error: "Quantity must be greater than 0" };

  // Fetch existing to validate stock balance after edit
  const existing = await prisma.godownInventory.findUnique({
    where: { id, agencyId: session.agencyId },
  });
  if (!existing) return { error: "Record not found" };

  // If changing a DISPATCHED record, ensure available stock still covers new qty
  if (existing.moveType === "DISPATCHED") {
    const agg = await prisma.godownInventory.groupBy({
      by: ["moveType"],
      where: { agencyId: session.agencyId, productId: existing.productId, id: { not: id } },
      _sum: { qty: true },
    });
    const received   = agg.find(a => a.moveType === "RECEIVED")?._sum.qty ?? 0;
    const dispatched = agg.find(a => a.moveType === "DISPATCHED")?._sum.qty ?? 0;
    const available  = received - dispatched;
    if (qty > available)
      return { error: `Only ${available} units available for dispatch` };
  }

  const editInvoiceNo = (formData.get("invoiceNo") as string)?.trim() || null;
  const editInvoiceDateStr = formData.get("invoiceDate") as string;
  const editInvoiceDate = editInvoiceDateStr ? new Date(editInvoiceDateStr) : null;

  const record = await prisma.godownInventory.update({
    where: { id, agencyId: session.agencyId },
    data: {
      qty,
      date: new Date(formData.get("date") as string || Date.now()),
      batchNo: (formData.get("batchNo") as string) || null,
      invoiceNo: editInvoiceNo,
      invoiceDate: editInvoiceDate,
      notes: (formData.get("notes") as string) || null,
    },
    include: {
      product: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  revalidatePath("/godown-keeper/inventory");
  revalidatePath("/godown-keeper/godown");
  revalidatePath("/admin/inventory");
  return { record: record as GodownInventoryWithProduct };
}

// ── Delete a movement ────────────────────────────────────────────────────────
export async function deleteGodownMovement(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId)
    return { error: "Unauthorized" };

  const existing = await prisma.godownInventory.findUnique({
    where: { id, agencyId: session.agencyId },
  });
  if (!existing) return { error: "Record not found" };

  // If deleting a RECEIVED record, ensure remaining stock stays non-negative
  if (existing.moveType === "RECEIVED") {
    const agg = await prisma.godownInventory.groupBy({
      by: ["moveType"],
      where: { agencyId: session.agencyId, productId: existing.productId, id: { not: id } },
      _sum: { qty: true },
    });
    const received   = agg.find(a => a.moveType === "RECEIVED")?._sum.qty ?? 0;
    const dispatched = agg.find(a => a.moveType === "DISPATCHED")?._sum.qty ?? 0;
    if (dispatched > received)
      return { error: "Cannot delete: would result in negative stock (dispatched > received)" };
  }

  await prisma.godownInventory.delete({ where: { id, agencyId: session.agencyId } });

  revalidatePath("/godown-keeper/inventory");
  revalidatePath("/godown-keeper/godown");
  revalidatePath("/admin/inventory");
  return { success: true };
}
