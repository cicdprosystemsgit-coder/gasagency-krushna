"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateInvoiceNo } from "@/lib/utils";

export async function createGstInvoice(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  if (!customerId) return { error: "Customer required" };

  const items = JSON.parse(formData.get("items") as string) as Array<{
    productId: string;
    productName: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  if (!items?.length) return { error: "At least one item required" };

  // ── Stock availability check ──────────────────────────────────────────────
  for (const item of items) {
    if (!item.productId) continue;

    // Get latest office stock from StockRecord (closing stock of the most recent record)
    const latestStockRecord = await prisma.stockRecord.findFirst({
      where: { agencyId: session.agencyId, productId: item.productId },
      orderBy: { date: "desc" },
    });
    const officeStock = latestStockRecord?.closingStock ?? 0;

    if (item.qty > officeStock) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true },
      });
      return {
        error: `Insufficient office stock for "${product?.name ?? item.productName}". Requested: ${item.qty}, Available in office: ${officeStock}.`,
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const invoice = await prisma.gstInvoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      customerId,
      date: new Date(formData.get("date") as string),
      items,
      subtotal: Number(formData.get("subtotal")),
      gstAmount: Number(formData.get("gstAmount")),
      total: Number(formData.get("total")),
      agencyId: session.agencyId,
      status: "PENDING",
    },
  });
  return { invoice };
}

// ── Stock map helper used by the page ────────────────────────────────────────
export async function getProductStockMap(agencyId: string): Promise<
  Record<string, { officeStock: number; godownStock: number }>
> {
  const [stockRecords, godownMovements] = await Promise.all([
    prisma.stockRecord.findMany({
      where: { agencyId },
      orderBy: { date: "desc" },
    }),
    prisma.godownInventory.groupBy({
      by: ["productId", "moveType"],
      where: { agencyId },
      _sum: { qty: true },
    }),
  ]);

  // Latest office stock per product
  const officeMap: Record<string, number> = {};
  for (const sr of stockRecords) {
    if (!(sr.productId in officeMap)) {
      officeMap[sr.productId] = sr.closingStock;
    }
  }

  // Godown stock per product
  const godownMap: Record<string, number> = {};
  for (const gm of godownMovements) {
    if (!godownMap[gm.productId]) godownMap[gm.productId] = 0;
    if (gm.moveType === "RECEIVED") godownMap[gm.productId] += gm._sum.qty ?? 0;
    else godownMap[gm.productId] = Math.max(0, godownMap[gm.productId] - (gm._sum.qty ?? 0));
  }

  // Merge both maps into a single map
  const allProductIds = new Set([...Object.keys(officeMap), ...Object.keys(godownMap)]);
  const stockMap: Record<string, { officeStock: number; godownStock: number }> = {};
  for (const id of allProductIds) {
    stockMap[id] = {
      officeStock: officeMap[id] ?? 0,
      godownStock: godownMap[id] ?? 0,
    };
  }

  return stockMap;
}
