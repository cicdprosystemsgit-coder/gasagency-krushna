"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
      isOfficeSale: false,
      dailyClosing: {
        date: { gte: start, lte: end },
        agencyId: session.agencyId!,
      }
    },
    select: {
      id: true,
      deliveryBoyId: true,
      submissionStatus: true,
      actualCashGiven: true,
      shortageAmount: true,
      excessAmount: true,
      shortageAddedToUdhari: true,
      submittedAt: true,
      managerVerifiedAt: true,
      adminConfirmedAt: true,
      notes: true,
      returnedQty: true,
    }
  });
  const closedMap = new Map(closedEntries.map((e) => [e.deliveryBoyId, e]));

  // Convert products record to array
  const result = Object.values(grouped).map((g) => {
    const entry = closedMap.get(g.deliveryBoy.id);
    return {
      ...g,
      products: Object.values(g.products),
      alreadyClosed: entry?.submissionStatus === "APPROVED",
      submissionStatus: entry?.submissionStatus || "PENDING",
      employeeClosingId: entry?.id || null,
      actualCashGiven: entry?.actualCashGiven ?? 0,
      submittedNotes: entry?.notes ?? "",
      submittedReturnedQty: entry?.returnedQty ?? g.returnedQty,
      shortageAmount: entry?.shortageAmount ?? 0,
      excessAmount: entry?.excessAmount ?? 0,
      shortageAddedToUdhari: entry?.shortageAddedToUdhari ?? false,
      submittedAt: entry?.submittedAt ? entry.submittedAt.toISOString() : null,
      managerVerifiedAt: entry?.managerVerifiedAt ? entry.managerVerifiedAt.toISOString() : null,
      adminConfirmedAt: entry?.adminConfirmedAt ? entry.adminConfirmedAt.toISOString() : null,
    };
  });

  return { deliveryBoys: result };
}

export async function getOfficeStaffForDate(dateStr: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const transactions = await prisma.officeTransaction.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: start, lte: end },
    },
    include: {
      addedBy: {
        select: { id: true, name: true },
      },
      product: {
        select: { id: true, name: true },
      },
    },
  });

  // Group by office staff (addedById)
  const grouped: Record<string, {
    deliveryBoyId: string;
    deliveryBoyName: string;
    cylinderBreakdown: any[];
    totalDelivered: number;
    pendingQty: number;
    returnedQty: number;
    cashCollected: number;
    onlineAmount: number;
    udhariAmount: number;
    kmBasedExtra: number;
    expectedTotal: number;
    actualCashGiven: number;
    notes: string;
    officeTransactionItems: {
      type: string;
      description: string | null;
      qty: number;
      unitRate: number;
      amount: number;
      paymentMode: string;
    }[];
  }> = {};

  for (const t of transactions) {
    const staffId = t.addedById;
    if (!staffId || !t.addedBy) continue;
    if (!grouped[staffId]) {
      grouped[staffId] = {
        deliveryBoyId: staffId,
        deliveryBoyName: t.addedBy.name,
        cylinderBreakdown: [],
        totalDelivered: 0,
        pendingQty: 0,
        returnedQty: 0,
        cashCollected: 0,
        onlineAmount: 0,
        udhariAmount: 0,
        kmBasedExtra: 0,
        expectedTotal: 0,
        actualCashGiven: 0,
        notes: "",
        officeTransactionItems: [],
      };
    }

    const group = grouped[staffId];
    group.totalDelivered += t.qty;

    const paymentMode = t.paymentMode || "CASH";
    const isCash = paymentMode === "CASH";
    const isCredit = paymentMode === "CREDIT";

    if (isCash) {
      group.cashCollected += t.amount;
    } else if (isCredit) {
      group.udhariAmount += t.amount;
    } else {
      group.onlineAmount += t.amount;
    }

    group.expectedTotal += t.amount;
    group.officeTransactionItems.push({
      type: t.type,
      description: t.product?.name ?? t.description ?? "—",
      qty: t.qty,
      unitRate: t.unitRate,
      amount: t.amount,
      paymentMode: paymentMode,
    });
  }

  // Check if any have already closed entries for this date
  const closedEntries = await prisma.dailyClosingEmployee.findMany({
    where: {
      agencyId: session.agencyId!,
      isOfficeSale: true,
      dailyClosing: {
        date: { gte: start, lte: end },
        agencyId: session.agencyId!,
      }
    },
    select: {
      deliveryBoyId: true
    }
  });
  const closedStaffIds = new Set(closedEntries.map(e => e.deliveryBoyId));

  // Convert to array
  const result = Object.values(grouped).map((g) => ({
    ...g,
    alreadyClosed: closedStaffIds.has(g.deliveryBoyId),
  }));

  return { officeStaff: result };
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
          isOfficeSale: !!emp.isOfficeSale,
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
        cashDenominations: emp.cashDenominations || [],
        shortageAmount: empShortage,
        excessAmount: empExcess,
        notes: emp.notes || null,
        fetchedFromDeliveries: emp.fetchedFromDeliveries !== false,
        isOfficeSale: !!emp.isOfficeSale,
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
    // 1. Fetch current employee closing to know previous shortage, salaryAdvanceId, and parent closing
    const existing = await tx.dailyClosingEmployee.findUnique({
      where: { id: employeeClosingId, agencyId: session.agencyId! },
      include: { dailyClosing: true },
    });
    if (!existing) throw new Error("Closing record not found");

    let newSalaryAdvanceId = existing.salaryAdvanceId;
    let shortageAddedToUdhari = existing.shortageAddedToUdhari;

    // Check if the closing or employee row is approved
    const isApproved = existing.dailyClosing.status === "APPROVED" || existing.submissionStatus === "APPROVED";

    if (isApproved && !existing.isOfficeSale) {
      const closingDate = existing.dailyClosing.date;

      if (shortageAmount > 0) {
        if (existing.salaryAdvanceId) {
          // Update existing SalaryAdvance amount
          await tx.salaryAdvance.update({
            where: { id: existing.salaryAdvanceId },
            data: {
              amount: shortageAmount,
              balanceAmount: shortageAmount,
              notes: `Daily Closing Cash Shortage updated by Admin on ${closingDate.toISOString().slice(0, 10)}.`,
            },
          });

          // Update corresponding SalaryDrawing if present
          await tx.salaryDrawing.updateMany({
            where: {
              employeeId: existing.deliveryBoyId,
              agencyId: session.agencyId!,
              date: closingDate,
              type: "ADVANCE",
            },
            data: {
              amount: shortageAmount,
              remarks: `Daily Closing Shortage: ₹${shortageAmount.toFixed(0)} (${closingDate.toISOString().slice(0, 10)}) [Admin Adjusted]`,
            },
          });
          shortageAddedToUdhari = true;
        } else {
          // Previously had no shortage advance, create one now
          const advance = await tx.salaryAdvance.create({
            data: {
              employeeId: existing.deliveryBoyId,
              amount: shortageAmount,
              recoveredAmount: 0,
              balanceAmount: shortageAmount,
              advanceDate: closingDate,
              reason: `Daily Closing Cash Shortage - ${closingDate.toISOString().slice(0, 10)}`,
              notes: `Automatically added to delivery boy udhari from Daily Closing cash shortage on ${closingDate.toISOString().slice(0, 10)} (Admin Adjusted).`,
              status: "PENDING",
              agencyId: session.agencyId!,
            },
          });
          newSalaryAdvanceId = advance.id;
          shortageAddedToUdhari = true;

          await tx.salaryDrawing.create({
            data: {
              employeeId: existing.deliveryBoyId,
              type: "ADVANCE",
              amount: shortageAmount,
              month: closingDate.getMonth() + 1,
              year: closingDate.getFullYear(),
              remarks: `Daily Closing Shortage: ₹${shortageAmount.toFixed(0)} (${closingDate.toISOString().slice(0, 10)}) [Admin Adjusted]`,
              date: closingDate,
              agencyId: session.agencyId!,
            },
          });
        }
      } else {
        // Shortage is now 0, but previously had an advance
        if (existing.salaryAdvanceId) {
          try {
            await tx.salaryAdvance.delete({
              where: { id: existing.salaryAdvanceId },
            });
          } catch {
            // Ignore if already deleted
          }

          try {
            await tx.salaryDrawing.deleteMany({
              where: {
                employeeId: existing.deliveryBoyId,
                agencyId: session.agencyId!,
                date: closingDate,
                type: "ADVANCE",
              },
            });
          } catch {
            // Ignore
          }

          newSalaryAdvanceId = null;
          shortageAddedToUdhari = false;
        }
      }
    }

    // 2. Update the employee closing row
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
        cashDenominations: (payload.cashDenominations !== undefined ? payload.cashDenominations : (existing.cashDenominations ?? [])) as any,
        shortageAmount,
        excessAmount,
        salaryAdvanceId: newSalaryAdvanceId,
        shortageAddedToUdhari,
        notes: notes || null,
        editedByManagerId: session.userId,
        editedAt: new Date(),
      },
    });

    // 3. Query all sibling employee closings for this daily closing
    const allEmpClosings = await tx.dailyClosingEmployee.findMany({
      where: { dailyClosingId: empClosing.dailyClosingId },
    });

    // 4. Re-aggregate totals
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

    // 5. Update parent daily closing
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

  revalidatePath("/admin/daily-closing");
  revalidatePath("/manager/daily-closing");
  revalidatePath("/delivery-boy/daily-closing");
  revalidatePath("/admin/stock");
  revalidatePath("/manager/stock");
  revalidatePath("/stock");
  revalidatePath("/salaries");
  revalidatePath("/credit-ledger");

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

  const result = await prisma.$transaction(async (tx) => {
    const closing = await tx.dailyClosing.findUnique({
      where: { id, agencyId: session.agencyId! },
      include: { employeeClosings: true },
    });
    if (!closing) throw new Error("Closing not found");

    if (role === "ADMIN") {
      // 1. Mark DailyClosing as APPROVED
      await tx.dailyClosing.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminApprovedAt: new Date(),
        },
      });

      // 2. Mark all employee closings as APPROVED and adminConfirmedAt
      for (const emp of closing.employeeClosings) {
        let advanceId = emp.salaryAdvanceId;

        // If there is cash shortage, automatically add directly into that delivery boy's Udhari (Advance)!
        if (emp.shortageAmount > 0 && !emp.salaryAdvanceId && !emp.isOfficeSale) {
          const advanceDate = closing.date;
          const advance = await tx.salaryAdvance.create({
            data: {
              employeeId: emp.deliveryBoyId,
              amount: emp.shortageAmount,
              recoveredAmount: 0,
              balanceAmount: emp.shortageAmount,
              advanceDate: advanceDate,
              reason: `Daily Closing Cash Shortage - ${advanceDate.toISOString().slice(0, 10)}`,
              notes: `Automatically added to delivery boy udhari from Daily Closing cash shortage on ${advanceDate.toISOString().slice(0, 10)}.`,
              status: "PENDING",
              agencyId: session.agencyId!,
            },
          });
          advanceId = advance.id;

          await tx.salaryDrawing.create({
            data: {
              employeeId: emp.deliveryBoyId,
              type: "ADVANCE",
              amount: emp.shortageAmount,
              month: advanceDate.getMonth() + 1,
              year: advanceDate.getFullYear(),
              remarks: `Daily Closing Shortage: ₹${emp.shortageAmount.toFixed(0)} (${advanceDate.toISOString().slice(0, 10)})`,
              date: advanceDate,
              agencyId: session.agencyId!,
            },
          });
        }

        await tx.dailyClosingEmployee.update({
          where: { id: emp.id },
          data: {
            submissionStatus: "APPROVED",
            adminConfirmedAt: new Date(),
            shortageAddedToUdhari: emp.shortageAmount > 0,
            salaryAdvanceId: advanceId,
          },
        });
      }
    } else {
      // MANAGER: Marks manager approval & verified by manager, forwards to Admin
      await tx.dailyClosing.update({
        where: { id },
        data: {
          managerApprovedAt: new Date(),
          cashVerified: true,
          cashVerifiedById: session.userId,
          cashVerifiedAt: new Date(),
        },
      });

      await tx.dailyClosingEmployee.updateMany({
        where: { dailyClosingId: id },
        data: {
          submissionStatus: "VERIFIED_BY_MANAGER",
          managerVerifiedAt: new Date(),
        },
      });
    }

    return true;
  });

  revalidatePath("/delivery-boy/daily-closing");
  revalidatePath("/manager/daily-closing");
  revalidatePath("/admin/daily-closing");
  revalidatePath("/stock");
  revalidatePath("/admin/stock");
  revalidatePath("/manager/stock");
  revalidatePath("/salaries");
  revalidatePath("/credit-ledger");

  return { success: !!result };
}

// ─── Delivery Boy Closing Flow Actions ──────────────────────────────────────────

export async function getDeliveryBoyClosingForDate(dateStr?: string) {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const selectedDate = dateStr || new Date().toISOString().slice(0, 10);
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);

  // 1. Fetch delivery records for today
  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId,
      deliveredById: session.userId,
      date: { gte: start, lte: end },
    },
    include: {
      product: {
        select: { id: true, name: true, saleRate: true },
      },
      customer: {
        select: { type: true, customerCode: true, name: true, phone: true },
      },
    },
  });

  let totalDelivered = 0;
  let pendingQty = 0;
  let returnedQty = 0;
  let cashCollected = 0;
  let onlineAmount = 0;
  let udhariAmount = 0;

  const productsMap: Record<string, {
    productId: string;
    productName: string;
    soldQty: number;
    baseRate: number;
    kmRate: number;
    kmExtra: number;
    totalAmt: number;
  }> = {};

  for (const d of deliveries) {
    totalDelivered += d.deliveredQty;
    pendingQty += d.pendingQty;
    returnedQty += d.returnedQty;

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

    cashCollected += cashVal;
    onlineAmount += onlineVal;
    udhariAmount += creditVal;

    const prodId = d.productId;
    const totalAmtForDelivery = cashVal + onlineVal + creditVal;
    const actualRate = d.deliveredQty > 0 ? Math.round((totalAmtForDelivery / d.deliveredQty) * 100) / 100 : d.product.saleRate;
    const key = `${prodId}_${actualRate}`;

    if (!productsMap[key]) {
      productsMap[key] = {
        productId: prodId,
        productName: d.product.name,
        soldQty: 0,
        baseRate: actualRate,
        kmRate: actualRate,
        kmExtra: 0,
        totalAmt: 0,
      };
    }
    const pInfo = productsMap[key];
    pInfo.soldQty += d.deliveredQty;
    pInfo.totalAmt += (d.deliveredQty * actualRate);
  }

  const expectedTotal = cashCollected + onlineAmount + udhariAmount;
  const expectedCash = expectedTotal - onlineAmount - udhariAmount;

  // 2. Check if a closing already exists
  const existingClosing = await prisma.dailyClosingEmployee.findFirst({
    where: {
      agencyId: session.agencyId,
      deliveryBoyId: session.userId,
      isOfficeSale: false,
      dailyClosing: {
        date: { gte: start, lte: end },
        agencyId: session.agencyId,
      },
    },
    include: {
      dailyClosing: {
        select: {
          id: true,
          status: true,
          managerApprovedAt: true,
          adminApprovedAt: true,
        },
      },
    },
  });

  // 3. Fetch delivery boy's current total pending advance / udhari balance
  const activeAdvances = await prisma.salaryAdvance.findMany({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      status: { in: ["PENDING", "PARTIAL"] },
    },
    select: { balanceAmount: true },
  });
  const currentAdvanceBalance = activeAdvances.reduce((sum, a) => sum + (a.balanceAmount || 0), 0);

  return {
    date: selectedDate,
    totalDelivered,
    pendingQty,
    returnedQty,
    cashCollected,
    onlineAmount,
    udhariAmount,
    expectedTotal,
    expectedCash,
    products: Object.values(productsMap),
    existingClosing: existingClosing
      ? {
          id: existingClosing.id,
          dailyClosingId: existingClosing.dailyClosingId,
          submissionStatus: existingClosing.submissionStatus,
          actualCashGiven: existingClosing.actualCashGiven,
          cashDenominations: existingClosing.cashDenominations as any,
          shortageAmount: existingClosing.shortageAmount,
          excessAmount: existingClosing.excessAmount,
          notes: existingClosing.notes,
          shortageAddedToUdhari: existingClosing.shortageAddedToUdhari,
          submittedAt: existingClosing.submittedAt ? existingClosing.submittedAt.toISOString() : null,
          managerVerifiedAt: existingClosing.managerVerifiedAt ? existingClosing.managerVerifiedAt.toISOString() : null,
          adminConfirmedAt: existingClosing.adminConfirmedAt ? existingClosing.adminConfirmedAt.toISOString() : null,
          dailyClosingStatus: existingClosing.dailyClosing.status,
        }
      : null,
    currentAdvanceBalance,
  };
}

export async function submitDeliveryBoyClosing(payload: {
  date: string;
  actualCashGiven: number;
  cashDenominations?: any[];
  returnedQty?: number;
  notes?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const { date, actualCashGiven, cashDenominations, returnedQty, notes } = payload;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  // Compute live stats for the delivery boy
  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId,
      deliveredById: session.userId,
      date: { gte: start, lte: end },
    },
    include: {
      product: { select: { id: true, name: true, saleRate: true } },
      customer: { select: { type: true } },
    },
  });

  let totalDelivered = 0;
  let pendingQty = 0;
  let computedReturned = 0;
  let cashCollected = 0;
  let onlineAmount = 0;
  let udhariAmount = 0;

  const productsMap: Record<string, any> = {};

  for (const d of deliveries) {
    totalDelivered += d.deliveredQty;
    pendingQty += d.pendingQty;
    computedReturned += d.returnedQty;

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
      if (isDom) onlineVal = d.creditAmount || 0;
      else creditVal = d.creditAmount || 0;
    } else {
      onlineVal = d.cashCollected;
    }

    cashCollected += cashVal;
    onlineAmount += onlineVal;
    udhariAmount += creditVal;

    const prodId = d.productId;
    const totalAmtForDelivery = cashVal + onlineVal + creditVal;
    const actualRate = d.deliveredQty > 0 ? Math.round((totalAmtForDelivery / d.deliveredQty) * 100) / 100 : d.product.saleRate;
    const key = `${prodId}_${actualRate}`;

    if (!productsMap[key]) {
      productsMap[key] = {
        productId: prodId,
        productName: d.product.name,
        soldQty: 0,
        baseRate: actualRate,
        kmRate: actualRate,
        kmExtra: 0,
        totalAmt: 0,
      };
    }
    const pInfo = productsMap[key];
    pInfo.soldQty += d.deliveredQty;
    pInfo.totalAmt += (d.deliveredQty * actualRate);
  }

  const expectedTotal = cashCollected + onlineAmount + udhariAmount;
  const expectedCash = expectedTotal - onlineAmount - udhariAmount;
  const actualCash = Number(actualCashGiven) || 0;
  const shortageAmount = expectedCash > actualCash ? expectedCash - actualCash : 0;
  const excessAmount = actualCash > expectedCash ? actualCash - expectedCash : 0;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create master DailyClosing
    let closing = await tx.dailyClosing.findFirst({
      where: {
        agencyId: session.agencyId!,
        date: { gte: start, lte: end },
      },
    });

    if (!closing) {
      closing = await tx.dailyClosing.create({
        data: {
          date: new Date(date),
          agencyId: session.agencyId!,
          status: "PENDING",
        },
      });
    }

    // 2. Find or create DailyClosingEmployee
    let empClosing = await tx.dailyClosingEmployee.findFirst({
      where: {
        dailyClosingId: closing.id,
        deliveryBoyId: session.userId,
        isOfficeSale: false,
        agencyId: session.agencyId!,
      },
    });

    const empData = {
      cylinderBreakdown: Object.values(productsMap),
      totalDelivered,
      pendingQty,
      returnedQty: returnedQty !== undefined ? Number(returnedQty) : computedReturned,
      udhariAmount,
      cashCollected,
      onlineAmount,
      kmBasedExtra: 0,
      expectedTotal,
      actualCashGiven: actualCash,
      cashDenominations: cashDenominations || [],
      shortageAmount,
      excessAmount,
      notes: notes || null,
      fetchedFromDeliveries: true,
      isOfficeSale: false,
      submissionStatus: "SUBMITTED_TO_MANAGER",
      submittedAt: new Date(),
    };

    if (empClosing) {
      empClosing = await tx.dailyClosingEmployee.update({
        where: { id: empClosing.id },
        data: empData,
      });
    } else {
      empClosing = await tx.dailyClosingEmployee.create({
        data: {
          ...empData,
          dailyClosingId: closing.id,
          deliveryBoyId: session.userId,
          agencyId: session.agencyId!,
        },
      });
    }

    // 3. Recalculate daily closing master aggregates
    const allEmpClosings = await tx.dailyClosingEmployee.findMany({
      where: { dailyClosingId: closing.id },
    });

    let totalDeliveriesSum = 0;
    let totalCashCollectedSum = 0;
    let totalOnlinePaymentSum = 0;
    let totalUdhariSum = 0;
    let totalCollectionSum = 0;
    let pendingDeliveriesSum = 0;
    let returnedCylindersSum = 0;
    let grandExpectedSum = 0;
    let cashOnHandSum = 0;
    let shortageAmountSum = 0;
    let excessAmountSum = 0;

    for (const ec of allEmpClosings) {
      totalDeliveriesSum += ec.totalDelivered;
      totalCashCollectedSum += ec.cashCollected;
      totalOnlinePaymentSum += ec.onlineAmount;
      totalUdhariSum += ec.udhariAmount;
      totalCollectionSum += ec.cashCollected + ec.onlineAmount;
      pendingDeliveriesSum += ec.pendingQty;
      returnedCylindersSum += ec.returnedQty;
      grandExpectedSum += ec.expectedTotal;
      cashOnHandSum += ec.actualCashGiven;
      shortageAmountSum += ec.shortageAmount;
      excessAmountSum += ec.excessAmount;
    }

    await tx.dailyClosing.update({
      where: { id: closing.id },
      data: {
        totalDeliveries: totalDeliveriesSum,
        totalCashCollected: totalCashCollectedSum,
        totalOnlinePayment: totalOnlinePaymentSum,
        totalUdhari: totalUdhariSum,
        totalCollection: totalCollectionSum,
        pendingDeliveries: pendingDeliveriesSum,
        returnedCylinders: returnedCylindersSum,
        grandExpected: grandExpectedSum,
        cashOnHand: cashOnHandSum,
        shortageAmount: shortageAmountSum,
        excessAmount: excessAmountSum,
      },
    });

    return empClosing;
  });

  revalidatePath("/delivery-boy/daily-closing");
  revalidatePath("/manager/daily-closing");
  revalidatePath("/admin/daily-closing");
  revalidatePath("/stock");
  revalidatePath("/admin/stock");
  revalidatePath("/manager/stock");

  return { success: true, employeeClosing: result };
}

export async function managerVerifyEmployeeClosing(payload: {
  employeeClosingId: string;
  verifiedCash: number;
  cashDenominations?: any[];
  addShortageToUdhari?: boolean;
  notes?: string;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const { employeeClosingId, verifiedCash, cashDenominations, addShortageToUdhari = true, notes } = payload;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyClosingEmployee.findUnique({
      where: { id: employeeClosingId, agencyId: session.agencyId! },
      include: { dailyClosing: true },
    });
    if (!existing) throw new Error("Closing record not found");

    const expectedCash = existing.expectedTotal - existing.onlineAmount - existing.udhariAmount;
    const actualCash = Number(verifiedCash) || 0;
    const shortageAmount = expectedCash > actualCash ? expectedCash - actualCash : 0;
    const excessAmount = actualCash > expectedCash ? actualCash - expectedCash : 0;

    const updated = await tx.dailyClosingEmployee.update({
      where: { id: employeeClosingId },
      data: {
        actualCashGiven: actualCash,
        cashDenominations: (cashDenominations !== undefined ? cashDenominations : (existing.cashDenominations ?? [])) as any,
        shortageAmount,
        excessAmount,
        shortageAddedToUdhari: shortageAmount > 0 ? !!addShortageToUdhari : false,
        submissionStatus: "VERIFIED_BY_MANAGER",
        managerVerifiedAt: new Date(),
        editedByManagerId: session.userId,
        editedAt: new Date(),
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    // Mark dailyClosing master managerApprovedAt and cashVerified
    await tx.dailyClosing.update({
      where: { id: existing.dailyClosingId },
      data: {
        managerApprovedAt: new Date(),
        cashVerified: true,
        cashVerifiedById: session.userId,
        cashVerifiedAt: new Date(),
      },
    });

    // Re-aggregate master totals
    const allEmpClosings = await tx.dailyClosingEmployee.findMany({
      where: { dailyClosingId: existing.dailyClosingId },
    });

    let grandExpectedSum = 0;
    let cashOnHandSum = 0;
    let shortageAmountSum = 0;
    let excessAmountSum = 0;

    for (const ec of allEmpClosings) {
      grandExpectedSum += ec.expectedTotal;
      cashOnHandSum += ec.actualCashGiven;
      shortageAmountSum += ec.shortageAmount;
      excessAmountSum += ec.excessAmount;
    }

    await tx.dailyClosing.update({
      where: { id: existing.dailyClosingId },
      data: {
        grandExpected: grandExpectedSum,
        cashOnHand: cashOnHandSum,
        shortageAmount: shortageAmountSum,
        excessAmount: excessAmountSum,
      },
    });

    return updated;
  });

  revalidatePath("/delivery-boy/daily-closing");
  revalidatePath("/manager/daily-closing");
  revalidatePath("/admin/daily-closing");
  revalidatePath("/stock");
  revalidatePath("/admin/stock");
  revalidatePath("/manager/stock");

  return { success: true, employeeClosing: result };
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

