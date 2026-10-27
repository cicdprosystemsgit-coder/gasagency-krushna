"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface StockRegisterFilterDate {
  date: string;
}

export interface CylinderCategorySummary {
  categoryKey: string; // "14.2kg", "19kg", "5kg_dom", "5kg_com", "47.5kg", "other"
  label: string;
  isCylinder: boolean;
  openingFull: number;
  openingEmpty: number;
  loadReceivedFull: number;
  loadReceivedEmpty: number;
  deliveredQty: number; // Dispatched/delivered
  ncTvQty: number;      // New Connection / TV
  emptiesReceived: number;
  closingFull: number;
  closingEmpty: number;
  physicalFull?: number;
  physicalEmpty?: number;
  diffFull?: number;
  diffEmpty?: number;
  minStock?: number;   // Minimum stock limit set by agency owner
  maxStock?: number;   // Maximum stock limit set by agency owner
  stockStatus?: "LOW" | "NORMAL" | "OVERSTOCK";
}

export interface StaffStockBalance {
  staffId: string;
  staffName: string;
  openingEmptyBalance: number;
  cylindersIssuedToday: number;
  cylindersDeliveredToday: number;
  emptiesReturnedToday: number;
  pendingWithStaff: number; // (Opening + Issued - Delivered - Returned)
  breakdownByProduct: Record<string, { issued: number; delivered: number; returned: number }>;
}

export interface ProductMovementLog {
  id: string;
  timestamp: string;
  movementType: "TRUCK_RECEIVED" | "OFFICE_INWARD" | "VEHICLE_DISPATCH" | "CUSTOMER_DELIVERY" | "COUNTER_SALE" | "DELIVERY_CANCELLED" | "EMPTY_RETURN" | "STARTING_STOCK";
  movementLabel: string;
  sourceOrDestination: string;
  qtyChanged: number; // positive or negative
  fullStockAfter: number;
  emptyStockAfter: number;
  notes?: string | null;
}

export async function getDailyStockRegisterData(dateStr: string) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const targetDate = new Date(dateStr);
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  // 1. Fetch agency products
  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      unitCost: true,
      saleRate: true,
      isCylinder: true,
      sortOrder: true,
      minStock: true,
      maxStock: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  // 2. Fetch or initialize DailyStockRegister record for this date
  const registerRecord = await prisma.dailyStockRegister.findFirst({
    where: { agencyId, date: dayStart },
  });

  // 3. Fetch all godown inventory movements for this day
  const godownMovementsToday = await prisma.godownInventory.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: {
      product: { select: { id: true, name: true, isCylinder: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });

  // 4. Fetch all plant truck ERV receipts (GodownRecord) for today
  const godownRecordsToday = await prisma.godownRecord.findMany({
    where: {
      agencyId,
      entryDate: { gte: dayStart, lte: dayEnd },
      isDeleted: false,
    },
  });

  // 4b. Fetch vehicle trip logs for today (Internal fleet dispatches and returns)
  const tripLogsToday = await prisma.vehicleTripLog.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
      isDeleted: false,
    },
    include: {
      vehicle: {
        select: {
          id: true,
          vehicleNo: true,
          vehicleName: true,
          assignedToId: true,
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
  });

  // 4c. Fetch delivery count requests for today
  const countRequestsToday = await prisma.deliveryCountRequest.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["FULFILLED", "APPROVED"] },
    },
    include: {
      requestedBy: { select: { id: true, name: true } },
    },
  });

  // 5. Fetch all customer delivery records for today
  const deliveryRecordsToday = await prisma.deliveryRecord.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: {
      product: { select: { id: true, name: true, isCylinder: true, saleRate: true } },
      deliveredBy: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, type: true } },
    },
  });

  // 6. Fetch all office transactions for today
  const officeTransactionsToday = await prisma.officeTransaction.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: {
      product: { select: { id: true, name: true, isCylinder: true } },
      addedBy: { select: { id: true, name: true } },
    },
  });

  // 7. Fetch active staff / delivery boys
  const agencyUsers = await prisma.user.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true, role: true, phone: true },
    orderBy: { name: "asc" },
  });

  // 8. Fetch cumulative previous stock to establish Opening Stock for the day
  const pastStockRecords = await prisma.stockRecord.findMany({
    where: {
      agencyId,
      date: { lt: dayStart },
    },
    orderBy: { date: "desc" },
  });
  const latestPrevOfficeStockMap = new Map<string, number>();
  pastStockRecords.forEach((sr) => {
    if (!latestPrevOfficeStockMap.has(sr.productId)) {
      latestPrevOfficeStockMap.set(sr.productId, sr.closingStock);
    }
  });

  // Cumulative godown movements before today
  const pastGodownMovements = await prisma.godownInventory.groupBy({
    by: ["productId", "moveType"],
    where: {
      agencyId,
      date: { lt: dayStart },
    },
    _sum: { qty: true },
  });

  const prevGodownStockMap = new Map<string, number>();
  pastGodownMovements.forEach((gm) => {
    const cur = prevGodownStockMap.get(gm.productId) ?? 0;
    if (gm.moveType === "RECEIVED") {
      prevGodownStockMap.set(gm.productId, cur + (gm._sum.qty ?? 0));
    } else {
      prevGodownStockMap.set(gm.productId, Math.max(0, cur - (gm._sum.qty ?? 0)));
    }
  });

  // Cumulative past empties collected from deliveries before today
  const pastDeliveryEmpties = await prisma.deliveryRecord.groupBy({
    by: ["productId"],
    where: { agencyId, date: { lt: dayStart }, status: "DELIVERED" },
    _sum: { returnedQty: true },
  });

  const prevEmptyStockMap = new Map<string, number>();
  pastDeliveryEmpties.forEach((d) => {
    prevEmptyStockMap.set(d.productId, d._sum.returnedQty || 0);
  });

  // Subtract past empties returned to plant truck before today
  const pastPlantRecords = await prisma.godownRecord.findMany({
    where: { agencyId, entryDate: { lt: dayStart }, isDeleted: false, status: "APPROVED" },
  });
  pastPlantRecords.forEach((gr) => {
    let rawItems: any = gr.items;
    if (typeof rawItems === "string") {
      try { rawItems = JSON.parse(rawItems); } catch {}
    }
    if (rawItems && typeof rawItems === "object" && !Array.isArray(rawItems) && Array.isArray(rawItems.exitItems)) {
      rawItems.exitItems.forEach((it: any) => {
        if (it.productId) {
          const cur = prevEmptyStockMap.get(it.productId) || 0;
          prevEmptyStockMap.set(it.productId, Math.max(0, cur - (Number(it.qty || it.emptyReturned || 0))));
        }
      });
    }
  });

  // Helper to categorize products (e.g. 14.2 kg, 19 kg, 5 kg, 47.5 kg)
  function getCategoryKey(pName: string): string {
    const lower = pName.toLowerCase();
    if (lower.includes("14.2") || lower.includes("dom")) return "14.2kg";
    if (lower.includes("19") || lower.includes("comm")) return "19kg";
    if (lower.includes("47.5") || lower.includes("47")) return "47.5kg";
    if (lower.includes("5") && lower.includes("com")) return "5kg_com";
    if (lower.includes("5")) return "5kg_dom";
    return "other";
  }

  // Pre-seed Category Summaries
  const CATEGORY_DEFS = [
    { key: "14.2kg", label: "14.2 kg Domestic", isCylinder: true },
    { key: "19kg", label: "19 kg Commercial", isCylinder: true },
    { key: "5kg_dom", label: "5 kg Domestic", isCylinder: true },
    { key: "5kg_com", label: "5 kg Commercial", isCylinder: true },
    { key: "47.5kg", label: "47.5 kg Industrial", isCylinder: true },
  ];

  const categoryMap = new Map<string, CylinderCategorySummary>();
  CATEGORY_DEFS.forEach((c) => {
    categoryMap.set(c.key, {
      categoryKey: c.key,
      label: c.label,
      isCylinder: c.isCylinder,
      openingFull: 0,
      openingEmpty: 0,
      loadReceivedFull: 0,
      loadReceivedEmpty: 0,
      deliveredQty: 0,
      ncTvQty: 0,
      emptiesReceived: 0,
      closingFull: 0,
      closingEmpty: 0,
    });
  });

  // Sum up Opening Stock per category
  products.forEach((p) => {
    const cKey = getCategoryKey(p.name);
    let cat = categoryMap.get(cKey);
    if (!cat) {
      cat = {
        categoryKey: cKey,
        label: p.name,
        isCylinder: p.isCylinder,
        openingFull: 0,
        openingEmpty: 0,
        loadReceivedFull: 0,
        loadReceivedEmpty: 0,
        deliveredQty: 0,
        ncTvQty: 0,
        emptiesReceived: 0,
        closingFull: 0,
        closingEmpty: 0,
      };
      categoryMap.set(cKey, cat);
    }

    const openOffice = latestPrevOfficeStockMap.get(p.id) ?? 0;
    const openGodown = prevGodownStockMap.get(p.id) ?? 0;
    const openEmpty = prevEmptyStockMap.get(p.id) ?? 0;
    cat.openingFull += (openOffice + openGodown);
    cat.openingEmpty += openEmpty;
    if (p.minStock !== null && p.minStock !== undefined && p.minStock > 0) {
      cat.minStock = (cat.minStock ?? 0) + (p.minStock || 0);
    }
    if (p.maxStock !== null && p.maxStock !== undefined && p.maxStock > 0) {
      cat.maxStock = (cat.maxStock ?? 0) + (p.maxStock || 0);
    }
  });

  // Calculate Today's Plant Truck Receipts (Loads)
  godownRecordsToday.forEach((gr) => {
    let rawItems: any = gr.items;
    if (typeof rawItems === "string") {
      try { rawItems = JSON.parse(rawItems); } catch {}
    }

    if (rawItems && typeof rawItems === "object" && !Array.isArray(rawItems)) {
      if (Array.isArray(rawItems.entryItems)) {
        rawItems.entryItems.forEach((it: any) => {
          const cKey = getCategoryKey(it.productName || "");
          const cat = categoryMap.get(cKey);
          if (cat) {
            cat.loadReceivedFull += Number(it.qty || it.filledReceived || 0);
          }
        });
      }
      if (Array.isArray(rawItems.exitItems)) {
        rawItems.exitItems.forEach((it: any) => {
          const cKey = getCategoryKey(it.productName || "");
          const cat = categoryMap.get(cKey);
          if (cat) {
            cat.loadReceivedEmpty += Number(it.qty || it.emptyReturned || 0);
          }
        });
      }
    } else if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((it: any) => {
        const cKey = getCategoryKey(it.productName || "");
        const cat = categoryMap.get(cKey);
        if (cat) {
          cat.loadReceivedFull += Number(it.filledReceived ?? it.qty ?? 0);
          cat.loadReceivedEmpty += Number(it.emptyReturned ?? 0);
        }
      });
    } else {
      // Fallback to top-level filled & empty on 14.2kg
      const cat = categoryMap.get("14.2kg");
      if (cat) {
        cat.loadReceivedFull += gr.filledCylindersReceived || 0;
        cat.loadReceivedEmpty += gr.emptyCylindersReturned || 0;
      }
    }
  });

  // Add individual godown inventory receipts if not from godownRecord
  godownMovementsToday.forEach((gm) => {
    if (gm.moveType === "RECEIVED" && gm.batchNo !== "STARTING_STOCK") {
      const cKey = getCategoryKey(gm.product?.name || gm.productName || "");
      const cat = categoryMap.get(cKey);
      if (cat && godownRecordsToday.length === 0) {
        cat.loadReceivedFull += gm.qty;
      }
    }
  });

  // Calculate Deliveries (वाटप) and Empties Returned (जमा)
  deliveryRecordsToday.forEach((dr) => {
    const cKey = getCategoryKey(dr.product?.name || dr.productName || "");
    const cat = categoryMap.get(cKey);
    if (cat) {
      if (dr.status === "DELIVERED") {
        cat.deliveredQty += dr.deliveredQty;
        cat.emptiesReceived += dr.returnedQty;
      }
    }
  });

  // Calculate Office Counter Dispatches and NC/TV
  officeTransactionsToday.forEach((ot) => {
    const cKey = getCategoryKey(ot.product?.name || ot.productName || "");
    const cat = categoryMap.get(cKey);
    if (cat) {
      if (ot.type === "CYLINDER_REFILL") {
        cat.deliveredQty += ot.qty;
        cat.emptiesReceived += ot.qty; // Counter refill exchanges empty for full
      } else if (ot.type === "NEW_CONNECTION") {
        cat.ncTvQty += ot.qty;
      }
    }
  });

  // Calculate Closing Stock = Opening + Receipts - Delivered - NC/TV
  categoryMap.forEach((cat) => {
    cat.closingFull = Math.max(0, cat.openingFull + cat.loadReceivedFull - cat.deliveredQty - cat.ncTvQty);
    cat.closingEmpty = Math.max(0, cat.openingEmpty + cat.emptiesReceived - cat.loadReceivedEmpty);
  });

  // Integrate Physical Stock audits & Stock Limits from registerRecord if saved
  const physicalMap = (registerRecord?.physicalStock as any) || {};
  const savedLimits = (registerRecord?.stockLimits as any) || {};
  categoryMap.forEach((cat) => {
    if (physicalMap[cat.categoryKey]) {
      cat.physicalFull = Number(physicalMap[cat.categoryKey].full ?? cat.closingFull);
      cat.physicalEmpty = Number(physicalMap[cat.categoryKey].empty ?? cat.closingEmpty);
      cat.diffFull = (cat.physicalFull ?? 0) - cat.closingFull;
      cat.diffEmpty = (cat.physicalEmpty ?? 0) - cat.closingEmpty;
    }

    if (savedLimits[cat.categoryKey]) {
      if (savedLimits[cat.categoryKey].minStock !== undefined) {
        cat.minStock = Number(savedLimits[cat.categoryKey].minStock);
      }
      if (savedLimits[cat.categoryKey].maxStock !== undefined) {
        cat.maxStock = Number(savedLimits[cat.categoryKey].maxStock);
      }
    }

    // Evaluate stock limits alert status set by agency owner
    if (cat.minStock !== undefined && cat.minStock > 0 && cat.closingFull < cat.minStock) {
      cat.stockStatus = "LOW";
    } else if (cat.maxStock !== undefined && cat.maxStock > 0 && cat.closingFull > cat.maxStock) {
      cat.stockStatus = "OVERSTOCK";
    } else {
      cat.stockStatus = "NORMAL";
    }
  });

  // 9. Calculate Staff Empty Cylinder Tally (खाली जमा-बाकी) from real trips and deliveries
  const staffBalances: StaffStockBalance[] = agencyUsers
    .filter((u) => ["DELIVERY_BOY", "STAFF", "MANAGER"].includes(u.role))
    .map((staff) => {
      let totalIssued = 0;
      let unsoldReturned = 0;
      let tripEmptyReturned = 0;
      let isAnyTripReturned = false;
      const prodBreakdown: Record<string, { issued: number; delivered: number; returned: number }> = {};

      // Match vehicle trip logs for this staff member
      const staffTrips = tripLogsToday.filter(
        (t) => t.vehicle?.assignedToId === staff.id || t.recordedById === staff.id
      );

      staffTrips.forEach((t) => {
        totalIssued += Number(t.cylindersLoaded || 0);
        if (t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN") {
          isAnyTripReturned = true;
          unsoldReturned += Number(t.cylindersReturned || 0);
          tripEmptyReturned += Number(t.cylindersDelivered || 0);
        }

        let tItems: any = t.items;
        if (typeof tItems === "string") {
          try { tItems = JSON.parse(tItems); } catch {}
        }
        if (Array.isArray(tItems)) {
          tItems.forEach((it: any) => {
            const pName = it.productName || "Cylinder";
            if (!prodBreakdown[pName]) {
              prodBreakdown[pName] = { issued: 0, delivered: 0, returned: 0 };
            }
            prodBreakdown[pName].issued += Number(it.loaded || 0);
            if (t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN") {
              prodBreakdown[pName].returned += Number(it.emptyReturned || 0);
            }
          });
        }
      });

      // If no trips yet, check fulfilled delivery count requests
      if (totalIssued === 0) {
        const staffReqs = countRequestsToday.filter((r) => r.requestedById === staff.id);
        staffReqs.forEach((r) => {
          totalIssued += Number(r.totalLoaded || r.totalRequested || 0);
          let fItems: any = r.fulfilledItems;
          if (typeof fItems === "string") {
            try { fItems = JSON.parse(fItems); } catch {}
          }
          if (Array.isArray(fItems)) {
            fItems.forEach((it: any) => {
              const pName = it.productName || "Cylinder";
              if (!prodBreakdown[pName]) {
                prodBreakdown[pName] = { issued: 0, delivered: 0, returned: 0 };
              }
              prodBreakdown[pName].issued += Number(it.loadedQty || 0);
            });
          }
        });
      }

      // Deliveries made today by this staff
      let delivered = 0;
      let deliveryEmpties = 0;

      deliveryRecordsToday
        .filter((d) => d.deliveredById === staff.id)
        .forEach((d) => {
          const pName = d.product?.name || "Cylinder";
          if (!prodBreakdown[pName]) {
            prodBreakdown[pName] = { issued: 0, delivered: 0, returned: 0 };
          }
          if (d.status === "DELIVERED") {
            delivered += d.deliveredQty;
            deliveryEmpties += d.returnedQty;
            prodBreakdown[pName].delivered += d.deliveredQty;
            if (!isAnyTripReturned) {
              prodBreakdown[pName].returned += d.returnedQty;
            }
          }
        });

      // If issued wasn't recorded through fleet trips, fallback to delivered count
      if (totalIssued === 0 && delivered > 0) {
        totalIssued = delivered;
        Object.keys(prodBreakdown).forEach((pName) => {
          if (prodBreakdown[pName].issued === 0) {
            prodBreakdown[pName].issued = prodBreakdown[pName].delivered;
          }
        });
      }

      const effectiveEmptiesReturned = tripEmptyReturned > 0 ? tripEmptyReturned : deliveryEmpties;

      // Pending cylinders:
      // If trip is returned: discrepancy between issued and (delivered + unsold)
      // If still on route: remaining full cylinders on vehicle + empties collected
      const pendingWithStaff = isAnyTripReturned
        ? Math.max(0, totalIssued - (delivered + unsoldReturned))
        : Math.max(0, totalIssued - delivered);

      return {
        staffId: staff.id,
        staffName: staff.name,
        openingEmptyBalance: 0,
        cylindersIssuedToday: totalIssued,
        cylindersDeliveredToday: delivered,
        emptiesReturnedToday: effectiveEmptiesReturned,
        pendingWithStaff,
        breakdownByProduct: prodBreakdown,
      };
    })
    .filter((s) => s.cylindersIssuedToday > 0 || s.cylindersDeliveredToday > 0 || s.emptiesReturnedToday > 0 || s.pendingWithStaff > 0);

  // 10. Cash Notes & Denomination Data
  const savedCashNotes = (registerRecord?.cashNotes as any) || {
    n2000: 0,
    n500: 0,
    n200: 0,
    n100: 0,
    n50: 0,
    n20: 0,
    n10: 0,
    coins: 0,
    total: 0,
  };

  // 11. Godown Expenses for the day
  const dailyExpensesToday = await prisma.expense.findMany({
    where: {
      agencyId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: {
      addedBy: { select: { name: true } },
    },
  });

  // 12. Delivery Boy Daily Closings & Cash/Udhari Reconciliation for today
  const employeeClosingsToday = await prisma.dailyClosingEmployee.findMany({
    where: {
      agencyId,
      dailyClosing: {
        date: { gte: dayStart, lte: dayEnd },
      },
    },
    include: {
      deliveryBoy: {
        select: { id: true, name: true, phone: true },
      },
      dailyClosing: {
        select: { id: true, status: true, managerApprovedAt: true, adminApprovedAt: true },
      },
    },
    orderBy: {
      deliveryBoy: { name: "asc" },
    },
  });

  // Fetch cumulative pending advances (Udhari) for all delivery boys in the agency
  const allStaffAdvances = await prisma.salaryAdvance.findMany({
    where: {
      agencyId,
      status: { in: ["PENDING", "PARTIAL"] },
    },
    select: { employeeId: true, balanceAmount: true },
  });
  const staffUdhariBalanceMap = new Map<string, number>();
  allStaffAdvances.forEach((a) => {
    staffUdhariBalanceMap.set(a.employeeId, (staffUdhariBalanceMap.get(a.employeeId) || 0) + (a.balanceAmount || 0));
  });

  const deliveryBoyUdhariSummary: DeliveryBoyUdhariRecord[] = employeeClosingsToday.map((ec) => {
    const expectedCash = ec.expectedTotal - ec.onlineAmount - ec.udhariAmount;
    return {
      id: ec.id,
      dailyClosingId: ec.dailyClosingId,
      deliveryBoyId: ec.deliveryBoyId,
      deliveryBoyName: ec.deliveryBoy?.name || "Staff",
      deliveryBoyPhone: ec.deliveryBoy?.phone || null,
      isOfficeSale: ec.isOfficeSale,
      totalDelivered: ec.totalDelivered,
      returnedQty: ec.returnedQty,
      expectedTotal: ec.expectedTotal,
      onlineAmount: ec.onlineAmount,
      customerUdhari: ec.udhariAmount,
      expectedCash,
      actualCashGiven: ec.actualCashGiven,
      shortageAmount: ec.shortageAmount,
      excessAmount: ec.excessAmount,
      shortageAddedToUdhari: ec.shortageAddedToUdhari,
      submissionStatus: ec.submissionStatus,
      submittedAt: ec.submittedAt ? ec.submittedAt.toISOString() : null,
      managerVerifiedAt: ec.managerVerifiedAt ? ec.managerVerifiedAt.toISOString() : null,
      adminConfirmedAt: ec.adminConfirmedAt ? ec.adminConfirmedAt.toISOString() : null,
      totalOutstandingUdhari: staffUdhariBalanceMap.get(ec.deliveryBoyId) || 0,
      notes: ec.notes,
      dailyClosingStatus: ec.dailyClosing.status,
    };
  });

  return {
    date: dateStr,
    registerRecord: registerRecord
      ? {
          id: registerRecord.id,
          status: registerRecord.status,
          notes: registerRecord.notes,
          cashNotes: savedCashNotes,
          physicalStock: physicalMap,
        }
      : null,
    products,
    categories: Array.from(categoryMap.values()),
    staffBalances,
    cashNotes: savedCashNotes,
    deliveryBoyUdhariSummary,
    expenses: dailyExpensesToday.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      addedByName: e.addedBy.name,
    })),
  };
}

export interface DeliveryBoyUdhariRecord {
  id: string;
  dailyClosingId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string | null;
  isOfficeSale: boolean;
  totalDelivered: number;
  returnedQty: number;
  expectedTotal: number;
  onlineAmount: number;
  customerUdhari: number;
  expectedCash: number;
  actualCashGiven: number;
  shortageAmount: number;
  excessAmount: number;
  shortageAddedToUdhari: boolean;
  submissionStatus: string;
  submittedAt: string | null;
  managerVerifiedAt: string | null;
  adminConfirmedAt: string | null;
  totalOutstandingUdhari: number;
  notes: string | null;
  dailyClosingStatus: string;
}

export async function saveDailyStockAudit(payload: {
  date: string;
  cashNotes?: Record<string, number>;
  physicalStock?: Record<string, { full: number; empty: number }>;
  stockLimits?: Record<string, { minStock: number; maxStock: number }>;
  notes?: string;
  status?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const targetDate = new Date(payload.date);
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

  try {
    const record = await prisma.dailyStockRegister.upsert({
      where: {
        agencyId_date: {
          agencyId,
          date: dayStart,
        },
      },
      create: {
        agencyId,
        date: dayStart,
        cashNotes: payload.cashNotes || {},
        physicalStock: payload.physicalStock || {},
        stockLimits: payload.stockLimits || undefined,
        notes: payload.notes || null,
        status: payload.status || "OPEN",
        submittedById: session.userId,
      },
      update: {
        cashNotes: payload.cashNotes || {},
        physicalStock: payload.physicalStock || {},
        ...(payload.stockLimits ? { stockLimits: payload.stockLimits } : {}),
        notes: payload.notes || null,
        status: payload.status || "OPEN",
        submittedById: session.userId,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/admin/stock");
    revalidatePath("/manager/stock");
    revalidatePath("/godown-keeper/stock");
    revalidatePath("/staff/stock");

    return { success: true, record };
  } catch (err: any) {
    console.error("saveDailyStockAudit error:", err);
    return { error: err?.message || "Failed to save stock audit record" };
  }
}

export async function updateAgencyStockLimits(
  limits: Record<string, { minStock: number; maxStock: number }>,
  dateStr?: string
) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  // Only Agency Owner (ADMIN) or MANAGER can set stock limits
  if (!["ADMIN", "MANAGER"].includes(session.role)) {
    return { error: "Only agency owner or manager can set stock limits (केवळ एजन्सी मालक किंवा व्यवस्थापक मर्यादा सेट करू शकतात)" };
  }

  const agencyId = session.agencyId;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

  try {
    // 1. Get all cylinder products in agency
    const agencyProducts = await prisma.product.findMany({
      where: {
        agencyId,
        isCylinder: true,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    function getCategoryKey(pName: string): string {
      const lower = pName.toLowerCase();
      if (lower.includes("14.2") || lower.includes("dom")) return "14.2kg";
      if (lower.includes("19") || lower.includes("comm")) return "19kg";
      if (lower.includes("47.5") || lower.includes("47")) return "47.5kg";
      if (lower.includes("5") && lower.includes("com")) return "5kg_com";
      if (lower.includes("5")) return "5kg_dom";
      return "other";
    }

    // 2. Update minStock and maxStock on matching Products
    for (const [catKey, lim] of Object.entries(limits)) {
      const minStock = Math.max(0, Number(lim.minStock) || 0);
      const maxStock = Math.max(0, Number(lim.maxStock) || 0);

      const matchingProductIds = agencyProducts
        .filter((p) => getCategoryKey(p.name) === catKey)
        .map((p) => p.id);

      if (matchingProductIds.length > 0) {
        await prisma.product.updateMany({
          where: {
            id: { in: matchingProductIds },
          },
          data: {
            minStock,
            maxStock,
          },
        });
      }
    }

    // 3. Upsert into dailyStockRegister for the selected day so the register snapshot has it
    await prisma.dailyStockRegister.upsert({
      where: {
        agencyId_date: {
          agencyId,
          date: dayStart,
        },
      },
      create: {
        agencyId,
        date: dayStart,
        stockLimits: limits,
        submittedById: session.userId,
      },
      update: {
        stockLimits: limits,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/admin/stock");
    revalidatePath("/manager/stock");
    revalidatePath("/godown-keeper/stock");
    revalidatePath("/staff/stock");

    return { success: true };
  } catch (err: any) {
    console.error("updateAgencyStockLimits error:", err);
    return { error: err?.message || "Failed to update stock limits" };
  }
}

