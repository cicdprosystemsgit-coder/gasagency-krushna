"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getDeliveryBoysForDate(dateStr: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: start, lte: end },
    },
    include: {
      deliveredBy: {
        select: { id: true, name: true },
      },
      product: {
        select: { id: true, name: true, saleRate: true },
      },
      customer: {
        select: { type: true, customerCode: true, name: true, phone: true },
      },
    },
  });

  // Group by delivery boy
  const grouped: Record<string, {
    deliveryBoy: { id: string; name: string };
    totalDelivered: number;
    pendingQty: number;
    returnedQty: number;
    cashCollected: number;
    onlineAmount: number;
    udhariAmount: number;
    products: Record<string, {
      productId: string;
      productName: string;
      soldQty: number;
      baseRate: number;
      kmRate: number;
      kmExtra: number;
      totalAmt: number;
    }>;
  }> = {};

  for (const d of deliveries) {
    const boyId = d.deliveredById;
    if (!boyId || !d.deliveredBy) continue;
    if (!grouped[boyId]) {
      grouped[boyId] = {
        deliveryBoy: { id: d.deliveredBy.id, name: d.deliveredBy.name },
        totalDelivered: 0,
        pendingQty: 0,
        returnedQty: 0,
        cashCollected: 0,
        onlineAmount: 0,
        udhariAmount: 0,
        products: {},
      };
    }

    const group = grouped[boyId];
    group.totalDelivered += d.deliveredQty;
    group.pendingQty += d.pendingQty;
    group.returnedQty += d.returnedQty;

    const isCash = d.paymentMode === "CASH";
    const isCredit = d.paymentMode === "CREDIT";
    const isPartial = d.paymentMode === "PARTIAL";

    let cashVal = 0;
    let onlineVal = 0;
    let creditVal = 0;

    if (isCash) {
      cashVal = d.cashCollected;
    } else if (isCredit) {
      creditVal = d.creditAmount || 0;
    } else if (isPartial) {
      cashVal = d.cashCollected;
      const isDom = d.customer.type === "DOMESTIC";
      if (isDom) {
        onlineVal = d.creditAmount || 0;
      } else {
        creditVal = d.creditAmount || 0;
      }
    } else {
      onlineVal = d.cashCollected;
    }

    group.cashCollected += cashVal;
    group.onlineAmount += onlineVal;
    group.udhariAmount += creditVal;

    const prodId = d.productId;
    const totalAmtForDelivery = cashVal + onlineVal + creditVal;
    const actualRate = d.deliveredQty > 0 ? Math.round((totalAmtForDelivery / d.deliveredQty) * 100) / 100 : d.product.saleRate;

    const key = `${prodId}_${actualRate}`;
    if (!group.products[key]) {
      group.products[key] = {
        productId: prodId,
        productName: d.product.name,
        soldQty: 0,
        baseRate: actualRate,
        kmRate: actualRate,
        kmExtra: 0,
        totalAmt: 0,
      };
    }
    const pInfo = group.products[key];
    pInfo.soldQty += d.deliveredQty;
    pInfo.totalAmt += (d.deliveredQty * actualRate);
  }

  // Check if any boys already have closed entries for this date
  const closedEntries = await prisma.dailyClosingEmployee.findMany({
    where: {
      agencyId: session.agencyId!,
      dailyClosing: {
        date: { gte: start, lte: end },
        agencyId: session.agencyId!,
      }
    },
    select: {
      deliveryBoyId: true
    }
  });
  const closedBoyIds = new Set(closedEntries.map(e => e.deliveryBoyId));

  // Convert products record to array
  const result = Object.values(grouped).map((g) => ({
    ...g,
    products: Object.values(g.products),
    alreadyClosed: closedBoyIds.has(g.deliveryBoy.id),
  }));

  return { deliveryBoys: result };
}

export async function createDailyClosingWithEmployees(formDataJson: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const payload = JSON.parse(formDataJson);
  const { date, notes, employeeClosings, cashVerified } = payload;

  if (!date) return { error: "Date is required" };
  if (!employeeClosings || !Array.isArray(employeeClosings)) return { error: "Employee closings are required" };

  // Calculate master aggregates
  let totalDeliveries = 0;
  let totalCashCollected = 0;
  let totalOnlinePayment = 0;
  let totalUdhari = 0;
  let totalCollection = 0;
  let pendingDeliveries = 0;
  let returnedCylinders = 0;
  let kmBasedExtra = 0;
  let grandExpected = 0;
  let cashOnHand = 0;
  let shortageAmount = 0;
  let excessAmount = 0;

  const result = await prisma.$transaction(async (tx) => {
    // Check if daily closing already exists for this date and agency
    let closing = await tx.dailyClosing.findFirst({
      where: {
        agencyId: session.agencyId!,
        date: {
          gte: new Date(new Date(date).setHours(0,0,0,0)),
          lte: new Date(new Date(date).setHours(23,59,59,999)),
        }
      }
    });

    if (!closing) {
      // 1. Create the DailyClosing master if not exists
      closing = await tx.dailyClosing.create({
        data: {
          date: new Date(date),
          notes: notes || null,
          agencyId: session.agencyId!,
          status: "PENDING",
          cashVerified: !!cashVerified,
          cashVerifiedById: cashVerified ? session.userId : null,
          cashVerifiedAt: cashVerified ? new Date() : null,
        },
      });
    } else {
      // If closing exists, update the master attributes if provided
      closing = await tx.dailyClosing.update({
        where: { id: closing.id },
        data: {
          notes: notes !== undefined ? notes : closing.notes,
          cashVerified: cashVerified !== undefined ? !!cashVerified : closing.cashVerified,
          cashVerifiedById: cashVerified ? session.userId : (cashVerified === false ? null : closing.cashVerifiedById),
          cashVerifiedAt: cashVerified ? new Date() : (cashVerified === false ? null : closing.cashVerifiedAt),
        }
      });
    }

    // 2. Create or update employee closings
    for (const emp of employeeClosings) {
      const expectedTotal = emp.expectedTotal || 0;
      const expectedCash = expectedTotal - (emp.onlineAmount || 0) - (emp.udhariAmount || 0);
      const actualCash = emp.actualCashGiven || 0;
      const empShortage = expectedCash > actualCash ? expectedCash - actualCash : 0;
      const empExcess = actualCash > expectedCash ? actualCash - expectedCash : 0;

      // Check if this employee's closing record already exists
      const existingEmpClosing = await tx.dailyClosingEmployee.findFirst({
        where: {
          dailyClosingId: closing.id,
          deliveryBoyId: emp.deliveryBoyId,
          agencyId: session.agencyId!,
        }
      });

      const empData = {
        cylinderBreakdown: emp.cylinderBreakdown || [],
        totalDelivered: emp.totalDelivered || 0,
        pendingQty: emp.pendingQty || 0,
        returnedQty: emp.returnedQty || 0,
        udhariAmount: emp.udhariAmount || 0,
        cashCollected: emp.cashCollected || 0,
        onlineAmount: emp.onlineAmount || 0,
        kmBasedExtra: emp.kmBasedExtra || 0,
        expectedTotal: expectedTotal,
        actualCashGiven: actualCash,
        shortageAmount: empShortage,
        excessAmount: empExcess,
        notes: emp.notes || null,
        fetchedFromDeliveries: emp.fetchedFromDeliveries !== false,
      };

      if (existingEmpClosing) {
        await tx.dailyClosingEmployee.update({
          where: { id: existingEmpClosing.id },
          data: {
            ...empData,
            editedByManagerId: session.userId,
            editedAt: new Date(),
          }
        });
      } else {
        await tx.dailyClosingEmployee.create({
          data: {
            ...empData,
            dailyClosingId: closing.id,
            deliveryBoyId: emp.deliveryBoyId,
            agencyId: session.agencyId!,
          },
        });
      }
    }

    // 3. Recalculate ALL aggregates for this date from the database rows
    const allEmpClosings = await tx.dailyClosingEmployee.findMany({
      where: {
        dailyClosingId: closing.id,
        agencyId: session.agencyId!,
      }
    });

    let totalDeliveries = 0;
    let totalCashCollected = 0;
    let totalOnlinePayment = 0;
    let totalUdhari = 0;
    let totalCollection = 0;
    let pendingDeliveries = 0;
    let returnedCylinders = 0;
    let kmBasedExtra = 0;
    let grandExpected = 0;
    let cashOnHand = 0;
    let shortageAmount = 0;
    let excessAmount = 0;

    for (const ec of allEmpClosings) {
      totalDeliveries += ec.totalDelivered;
      totalCashCollected += ec.cashCollected;
      totalOnlinePayment += ec.onlineAmount;
      totalUdhari += ec.udhariAmount;
      totalCollection += ec.cashCollected + ec.onlineAmount;
      pendingDeliveries += ec.pendingQty;
      returnedCylinders += ec.returnedQty;
      kmBasedExtra += ec.kmBasedExtra;
      grandExpected += ec.expectedTotal;
      cashOnHand += ec.actualCashGiven;
      shortageAmount += ec.shortageAmount;
      excessAmount += ec.excessAmount;
    }

    const updatedClosing = await tx.dailyClosing.update({
      where: { id: closing.id },
      data: {
        totalDeliveries,
        totalCashCollected,
        totalOnlinePayment,
        totalUdhari,
        totalCollection,
        pendingDeliveries,
        returnedCylinders,
        kmBasedExtra,
        grandExpected,
        cashOnHand,
        shortageAmount,
        excessAmount,
      },
    });

    return updatedClosing;
  });

  return { closing: result };
}

export async function updateDailyClosingEmployee(employeeClosingId: string, formDataJson: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const payload = JSON.parse(formDataJson);
  const {
    cylinderBreakdown,
    totalDelivered,
    pendingQty,
    returnedQty,
    udhariAmount,
    cashCollected,
    onlineAmount,
    kmBasedExtra,
    expectedTotal,
    actualCashGiven,
    notes,
  } = payload;

  const expectedCash = (expectedTotal || 0) - (onlineAmount || 0) - (udhariAmount || 0);
  const actualCash = actualCashGiven || 0;
  const shortageAmount = expectedCash > actualCash ? expectedCash - actualCash : 0;
  const excessAmount = actualCash > expectedCash ? actualCash - expectedCash : 0;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update the employee closing row
    const empClosing = await tx.dailyClosingEmployee.update({
      where: { id: employeeClosingId, agencyId: session.agencyId! },
      data: {
        cylinderBreakdown: cylinderBreakdown || [],
        totalDelivered: totalDelivered || 0,
        pendingQty: pendingQty || 0,
        returnedQty: returnedQty || 0,
        udhariAmount: udhariAmount || 0,
        cashCollected: cashCollected || 0,
        onlineAmount: onlineAmount || 0,
        kmBasedExtra: kmBasedExtra || 0,
        expectedTotal: expectedTotal || 0,
        actualCashGiven: actualCash,
        shortageAmount,
        excessAmount,
        notes: notes || null,
        editedByManagerId: session.userId,
        editedAt: new Date(),
      },
    });

    // 2. Query all sibling employee closings for this daily closing
    const allEmpClosings = await tx.dailyClosingEmployee.findMany({
      where: { dailyClosingId: empClosing.dailyClosingId },
    });

    // 3. Re-aggregate totals
    let totalDeliveries = 0;
    let totalCashCollected = 0;
    let totalOnlinePayment = 0;
    let totalUdhari = 0;
    let totalCollection = 0;
    let pendingDeliveries = 0;
    let returnedCylinders = 0;
    let kmBasedExtraTotal = 0;
    let grandExpected = 0;
    let cashOnHand = 0;
    let shortageAmountTotal = 0;
    let excessAmountTotal = 0;

    for (const emp of allEmpClosings) {
      totalDeliveries += emp.totalDelivered;
      totalCashCollected += emp.cashCollected;
      totalOnlinePayment += emp.onlineAmount;
      totalUdhari += emp.udhariAmount;
      totalCollection += emp.cashCollected + emp.onlineAmount;
      pendingDeliveries += emp.pendingQty;
      returnedCylinders += emp.returnedQty;
      kmBasedExtraTotal += emp.kmBasedExtra;
      grandExpected += emp.expectedTotal;
      cashOnHand += emp.actualCashGiven;
      shortageAmountTotal += emp.shortageAmount;
      excessAmountTotal += emp.excessAmount;
    }

    // 4. Update parent daily closing
    await tx.dailyClosing.update({
      where: { id: empClosing.dailyClosingId },
      data: {
        totalDeliveries,
        totalCashCollected,
        totalOnlinePayment,
        totalUdhari,
        totalCollection,
        pendingDeliveries,
        returnedCylinders,
        kmBasedExtra: kmBasedExtraTotal,
        grandExpected,
        cashOnHand,
        shortageAmount: shortageAmountTotal,
        excessAmount: excessAmountTotal,
      },
    });

    return empClosing;
  });

  return { success: true, employeeClosing: result };
}

export async function verifyCash(closingId: string, cashOnHand: number) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const closing = await prisma.dailyClosing.findUnique({
    where: { id: closingId, agencyId: session.agencyId! },
  });

  if (!closing) return { error: "Daily closing not found" };

  const expectedCash = closing.grandExpected - closing.totalOnlinePayment - closing.totalUdhari;
  const shortageAmount = expectedCash > cashOnHand ? expectedCash - cashOnHand : 0;
  const excessAmount = cashOnHand > expectedCash ? cashOnHand - expectedCash : 0;

  const updated = await prisma.dailyClosing.update({
    where: { id: closingId },
    data: {
      cashOnHand,
      shortageAmount,
      excessAmount,
      cashVerified: true,
      cashVerifiedById: session.userId,
      cashVerifiedAt: new Date(),
    },
  });

  return { success: true, closing: updated };
}

export async function getDailyClosingDetails(closingId: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const closing = await prisma.dailyClosing.findUnique({
    where: { id: closingId, agencyId: session.agencyId },
    include: {
      employeeClosings: {
        include: {
          deliveryBoy: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          deliveryBoy: { name: "asc" },
        },
      },
    },
  });

  return { closing };
}

export async function approveDailyClosing(id: string, role: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { success: false };

  const data =
    role === "ADMIN"
      ? { status: "APPROVED" as const, adminApprovedAt: new Date() }
      : { managerApprovedAt: new Date() };

  await prisma.dailyClosing.update({ where: { id, agencyId: session.agencyId }, data });
  return { success: true };
}

// Old/Simple compatibility export
export async function createDailyClosing(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { error: "Unauthorized" };

  const totalDeliveries = Number(formData.get("totalDeliveries"));
  if (!totalDeliveries && totalDeliveries !== 0) return { error: "Total deliveries required" };

  const closing = await prisma.dailyClosing.create({
    data: {
      date: new Date(formData.get("date") as string),
      totalDeliveries,
      totalCollection: Number(formData.get("totalCollection")) || 0,
      pendingDeliveries: Number(formData.get("pendingDeliveries")) || 0,
      returnedCylinders: Number(formData.get("returnedCylinders")) || 0,
      cashOnHand: Number(formData.get("cashOnHand")) || 0,
      notes: (formData.get("notes") as string) || null,
      agencyId: session.agencyId,
      status: "PENDING",
    },
  });
  return { closing };
}
