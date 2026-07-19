"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    throw new Error("Unauthorized: ADMIN role required");
  }
  return { agencyId: session.agencyId, userId: session.userId };
}

export async function getTaxSummary(financialYear: string) {
  try {
    const { agencyId } = await requireAdmin();

    // Parse financial year (e.g. "2024-25")
    const parts = financialYear.split("-");
    if (parts.length !== 2) {
      return { error: "Invalid financial year format. Expected format: YYYY-YY" };
    }

    const startYear = parseInt(parts[0]);
    let endYearStr = parts[1];
    let endYear = startYear + 1;
    if (endYearStr.length === 2) {
      endYear = Math.floor(startYear / 100) * 100 + parseInt(endYearStr);
    } else if (endYearStr.length === 4) {
      endYear = parseInt(endYearStr);
    }

    // Financial year runs from April 1st of startYear to March 31st of endYear
    const fyStart = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)); // April 1st
    const fyEnd = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)); // March 31st

    // 1. Total Agency Revenue
    const deliveriesSum = await prisma.deliveryRecord.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        cashCollected: true,
        creditAmount: true,
      },
    });

    const commercialSum = await prisma.commercialSale.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        amount: true,
      },
    });

    const officeTxnSum = await prisma.officeTransaction.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        amount: true,
      },
    });

    const revenueDeliveries = (deliveriesSum._sum.cashCollected || 0) + (deliveriesSum._sum.creditAmount || 0);
    const revenueCommercial = commercialSum._sum.amount || 0;
    const revenueOffice = officeTxnSum._sum.amount || 0;
    const totalRevenue = revenueDeliveries + revenueCommercial + revenueOffice;

    // 2. Cost of Cylinder Stock
    const cogsSum = await prisma.companyPayment.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        amount: true,
      },
    });
    const totalCogs = cogsSum._sum.amount || 0;

    // 3. Staff Salaries & Bonuses
    const salariesSum = await prisma.salaryDrawing.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
        type: { in: ["SALARY", "BONUS"] },
      },
      _sum: {
        amount: true,
      },
    });
    const totalSalaries = salariesSum._sum.amount || 0;

    // 4. Operating Expenses (grouped by category)
    const expensesGrouped = await prisma.expense.groupBy({
      by: ["category"],
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        amount: true,
      },
    });
    const expensesByCategory = expensesGrouped.map((g) => ({
      category: g.category || "General",
      amount: g._sum.amount || 0,
    }));
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.amount, 0);

    // 5. Owner Drawings
    const drawingsSum = await prisma.salaryDrawing.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
        type: "DRAWING",
      },
      _sum: {
        amount: true,
      },
    });
    const totalDrawings = drawingsSum._sum.amount || 0;

    // 6. Bad Debts Written Off
    const badDebtsSum = await prisma.personalUdhaari.aggregate({
      where: {
        agencyId,
        status: "WRITTEN_OFF",
        updatedAt: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        balanceAmount: true,
      },
    });
    const totalBadDebts = badDebtsSum._sum.balanceAmount || 0;

    // 7. GST Collected
    const gstSum = await prisma.gstInvoice.aggregate({
      where: {
        agencyId,
        date: { gte: fyStart, lte: fyEnd },
      },
      _sum: {
        gstAmount: true,
        total: true,
        subtotal: true,
      },
      _count: {
        id: true,
      },
    });
    const totalGstCollected = gstSum._sum.gstAmount || 0;
    const gstTotalInvoices = gstSum._count.id || 0;
    const gstSubtotal = gstSum._sum.subtotal || 0;

    // 8. Fixed Deposits Interest Earned
    const fdRecords = await prisma.fdLoanRecord.findMany({
      where: {
        agencyId,
        type: { in: ["FIXED_DEPOSIT", "RECURRING_DEPOSIT"] },
        startDate: { lte: fyEnd },
      },
    });

    let totalFdInterest = 0;
    const fdInterestDetails = fdRecords.map((fd) => {
      // Overlap days in current financial year
      const recordStart = new Date(fd.startDate);
      const recordEnd = fd.maturityDate ? new Date(fd.maturityDate) : fyEnd;

      const overlapStart = recordStart > fyStart ? recordStart : fyStart;
      const overlapEnd = recordEnd < fyEnd ? recordEnd : fyEnd;

      let overlapDays = 0;
      if (overlapEnd >= overlapStart) {
        const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
        overlapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      // Simple interest approximation: principal * rate * (days / 365)
      const interestEarned = fd.principalAmount * (fd.interestRate / 100) * (overlapDays / 365);
      totalFdInterest += interestEarned;

      return {
        bankName: fd.bankName,
        accountRef: fd.accountRef || "N/A",
        principal: fd.principalAmount,
        rate: fd.interestRate,
        daysInPeriod: overlapDays,
        interestEarned: Math.round(interestEarned * 100) / 100,
      };
    });

    // 9. Loan Interest Paid
    const loanRecords = await prisma.fdLoanRecord.findMany({
      where: {
        agencyId,
        type: { in: ["PERSONAL_LOAN", "BUSINESS_LOAN", "VEHICLE_LOAN", "HOME_LOAN"] },
        startDate: { lte: fyEnd },
      },
      include: {
        emiPayments: {
          where: {
            dueDate: { gte: fyStart, lte: fyEnd },
            isPaid: true,
          },
        },
      },
    });

    let totalEmiPaid = 0;
    let totalPenaltyPaid = 0;
    const loanDetails = loanRecords.map((loan) => {
      const emiSum = loan.emiPayments.reduce((sum, pay) => sum + pay.amount, 0);
      const penaltySum = loan.emiPayments.reduce((sum, pay) => sum + pay.penaltyAmt, 0);

      totalEmiPaid += emiSum;
      totalPenaltyPaid += penaltySum;

      return {
        bankName: loan.bankName,
        loanRef: loan.accountRef || "N/A",
        principal: loan.principalAmount,
        rate: loan.interestRate,
        emiPaidAmount: emiSum,
        penaltyPaidAmount: penaltySum,
      };
    });

    // Net Calculations
    const grossProfit = totalRevenue - totalCogs;
    const totalOperatingExpenses = totalSalaries + totalExpenses + totalBadDebts;
    const netProfit = grossProfit - totalOperatingExpenses - totalPenaltyPaid; // Operating net profit

    return {
      success: true,
      fyStart: fyStart.toISOString().split("T")[0],
      fyEnd: fyEnd.toISOString().split("T")[0],
      financialYear,
      metrics: {
        revenueDeliveries,
        revenueCommercial,
        revenueOffice,
        totalRevenue,
        totalCogs,
        grossProfit,
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        totalSalaries,
        totalExpenses,
        totalBadDebts,
        totalOperatingExpenses,
        netProfit,
        netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        totalDrawings,
        totalFdInterest: Math.round(totalFdInterest * 100) / 100,
        totalEmiPaid,
        totalPenaltyPaid,
        totalGstCollected,
        gstTotalInvoices,
        gstSubtotal,
      },
      expensesByCategory,
      fdInterestDetails,
      loanDetails,
    };
  } catch (error: any) {
    console.error("Error in getTaxSummary:", error);
    return { error: error.message || "Failed to generate tax summary" };
  }
}
