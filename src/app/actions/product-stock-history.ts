"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface ProductStockHistoryEvent {
  id: string;
  timestamp: string;
  type: string;
  typeLabel: string;
  sourceOrParty: string;
  quantityChange: number; // +ve for incoming/unloading, -ve for outgoing/delivered
  notes: string;
  referenceId?: string;
}

export async function getProductStockMovementHistory(
  productId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  product?: { id: string; name: string; isCylinder: boolean; saleRate: number };
  events?: ProductStockHistoryEvent[];
  stats?: {
    totalLoadedIn: number;
    totalDelivered: number;
    totalReturnedEmpties: number;
    totalCancelled: number;
    totalOfficeSales: number;
    currentNetBalance: number;
  };
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const product = await prisma.product.findFirst({
    where: { id: productId, agencyId },
    select: { id: true, name: true, isCylinder: true, saleRate: true },
  });

  if (!product) {
    return { error: "Product not found" };
  }

  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  // 1. Fetch Godown Movements (Truck Received, Dispatched to Office, Starting Stock)
  const godownMovements = await prisma.godownInventory.findMany({
    where: {
      agencyId,
      productId,
      date: { gte: from, lte: to },
    },
    include: {
      recordedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // 2. Fetch Customer Deliveries & Cancellations
  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId,
      productId,
      date: { gte: from, lte: to },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // 3. Fetch Office Transactions (Counter Sales, NC, TV)
  const officeTransactions = await prisma.officeTransaction.findMany({
    where: {
      agencyId,
      inventoryId: productId,
      date: { gte: from, lte: to },
    },
    include: {
      customer: { select: { name: true } },
      addedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // 4. Transform into unified chronological events
  const events: ProductStockHistoryEvent[] = [];

  let totalLoadedIn = 0;
  let totalDelivered = 0;
  let totalReturnedEmpties = 0;
  let totalCancelled = 0;
  let totalOfficeSales = 0;

  // Process Godown
  godownMovements.forEach((gm) => {
    if (gm.moveType === "RECEIVED") {
      totalLoadedIn += gm.qty;
      events.push({
        id: `gm-${gm.id}`,
        timestamp: gm.date.toISOString(),
        type: gm.batchNo === "STARTING_STOCK" ? "STARTING_STOCK" : "LOAD_RECEIVED",
        typeLabel: gm.batchNo === "STARTING_STOCK" ? "Initial Starting Stock" : "Plant Truck Inward",
        sourceOrParty: gm.invoiceNo ? `Invoice #${gm.invoiceNo}` : `Godown (${gm.recordedBy?.name ?? "Staff"})`,
        quantityChange: gm.qty,
        notes: gm.notes ?? (gm.batchNo ? `Batch: ${gm.batchNo}` : "Plant truck unloading"),
        referenceId: gm.id,
      });
    } else {
      events.push({
        id: `gm-${gm.id}`,
        timestamp: gm.date.toISOString(),
        type: "OFFICE_DISPATCH",
        typeLabel: "Dispatched to Agency Office",
        sourceOrParty: `Office Counter (By ${gm.recordedBy?.name ?? "Staff"})`,
        quantityChange: -gm.qty,
        notes: gm.notes ?? "Transferred to agency office counter",
        referenceId: gm.id,
      });
    }
  });

  // Process Deliveries
  deliveries.forEach((d) => {
    if (d.status === "DELIVERED") {
      totalDelivered += d.deliveredQty;
      totalReturnedEmpties += d.returnedQty;

      events.push({
        id: `del-${d.id}`,
        timestamp: d.date.toISOString(),
        type: "CUSTOMER_DELIVERY",
        typeLabel: "Customer Doorstep Delivery",
        sourceOrParty: `${d.customer?.name ?? "Customer"} (Delivered by ${d.deliveredBy?.name ?? "Staff"})`,
        quantityChange: -d.deliveredQty,
        notes: `Empties Returned: ${d.returnedQty} · Payment: ${d.paymentMode} (₹${d.cashCollected})`,
        referenceId: d.id,
      });
    } else if (d.status === "CANCELLED" || d.status === "UNDELIVERED") {
      totalCancelled += (d.pendingQty || 1);
      events.push({
        id: `del-${d.id}`,
        timestamp: d.date.toISOString(),
        type: "DELIVERY_CANCELLED",
        typeLabel: "Delivery Cancelled / Returned to Godown",
        sourceOrParty: `${d.customer?.name ?? "Customer"} (${d.deliveredBy?.name ?? "Staff"})`,
        quantityChange: 0,
        notes: d.notes || "Customer unavailable / Order cancelled",
        referenceId: d.id,
      });
    }
  });

  // Process Office Transactions
  officeTransactions.forEach((ot) => {
    totalOfficeSales += ot.qty;
    events.push({
      id: `ot-${ot.id}`,
      timestamp: ot.date.toISOString(),
      type: "COUNTER_SALE",
      typeLabel: `Counter Sale (${ot.type})`,
      sourceOrParty: ot.customer?.name ? `${ot.customer.name} (Counter)` : `Direct Counter (By ${ot.addedBy?.name ?? "Staff"})`,
      quantityChange: -ot.qty,
      notes: ot.description || `Rate: ₹${ot.unitRate} · Mode: ${ot.paymentMode}`,
      referenceId: ot.id,
    });
  });

  // Sort events newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const currentNetBalance = totalLoadedIn - totalDelivered - totalOfficeSales;

  return {
    product,
    events,
    stats: {
      totalLoadedIn,
      totalDelivered,
      totalReturnedEmpties,
      totalCancelled,
      totalOfficeSales,
      currentNetBalance: Math.max(0, currentNetBalance),
    },
  };
}
