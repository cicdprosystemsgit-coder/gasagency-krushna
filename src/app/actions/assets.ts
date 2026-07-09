"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type VehicleAgencyAsset } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function getFinancialSummary(fromStr: string, toStr: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };
  const agencyId = session.agencyId;

  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  // Parallel fetch of database metrics
  const [
    deliveriesSum,
    commercialSum,
    officeSum,
    companyPaymentSum,
    expenseSum,
    salaryDrawingSum,
    debitEntries,
    creditEntries,
    latestClosing,
    activeAssetsSum,
  ] = await Promise.all([
    prisma.deliveryRecord.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { cashCollected: true },
    }),
    prisma.commercialSale.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.officeTransaction.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.companyPayment.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.salaryDrawing.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.creditLedgerEntry.aggregate({
      where: { agencyId, type: "DEBIT" },
      _sum: { amount: true },
    }),
    prisma.creditLedgerEntry.aggregate({
      where: { agencyId, type: "CREDIT" },
      _sum: { amount: true },
    }),
    prisma.dailyClosing.findFirst({
      where: { agencyId },
      orderBy: { date: "desc" },
      select: { cashOnHand: true },
    }),
    prisma.vehicleAgencyAsset.aggregate({
      where: { agencyId, isActive: true },
      _sum: { price: true },
    }),
  ]);

  // Compute values
  const domesticRevenue = deliveriesSum._sum.cashCollected || 0;
  const commercialRevenue = commercialSum._sum.amount || 0;
  const officeRevenue = officeSum._sum.amount || 0;
  const totalRevenue = domesticRevenue + commercialRevenue + officeRevenue;

  const totalCOGS = companyPaymentSum._sum.amount || 0;
  const grossProfit = totalRevenue - totalCOGS;

  const operationalExpenses = expenseSum._sum.amount || 0;
  const payrollExpenses = salaryDrawingSum._sum.amount || 0;
  const totalOpEx = operationalExpenses + payrollExpenses;

  const netProfit = grossProfit - totalOpEx;

  const totalDebits = debitEntries._sum.amount || 0;
  const totalCredits = creditEntries._sum.amount || 0;
  const totalReceivables = Math.max(0, totalDebits - totalCredits);

  const cashOnHand = latestClosing?.cashOnHand || 0;
  const physicalAssetsValue = activeAssetsSum._sum.price || 0;

  // Stock valuation
  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, unitCost: true },
  });

  let stockValuation = 0;
  for (const prod of products) {
    const latestStock = await prisma.stockRecord.findFirst({
      where: { agencyId, productId: prod.id },
      orderBy: { date: "desc" },
      select: { closingStock: true },
    });
    if (latestStock) {
      stockValuation += latestStock.closingStock * prod.unitCost;
    }
  }

  return {
    summary: {
      domesticRevenue,
      commercialRevenue,
      officeRevenue,
      totalRevenue,
      totalCOGS,
      grossProfit,
      operationalExpenses,
      payrollExpenses,
      totalOpEx,
      netProfit,
      totalReceivables,
      cashOnHand,
      physicalAssetsValue,
      stockValuation,
    },
  };
}

export async function getRevenueAndCOGSBreakdown(months = 6) {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [deliveries, commercial, office, companyPayments] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where: { agencyId, date: { gte: since } },
      select: { date: true, cashCollected: true },
    }),
    prisma.commercialSale.findMany({
      where: { agencyId, date: { gte: since } },
      select: { date: true, amount: true },
    }),
    prisma.officeTransaction.findMany({
      where: { agencyId, date: { gte: since } },
      select: { date: true, amount: true },
    }),
    prisma.companyPayment.findMany({
      where: { agencyId, date: { gte: since } },
      select: { date: true, amount: true },
    }),
  ]);

  // Group by YYYY-MM
  const map = new Map<string, { domestic: number; commercial: number; office: number; cogs: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { domestic: 0, commercial: 0, office: 0, cogs: 0 });
  }

  deliveries.forEach((d) => {
    const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.domestic += d.cashCollected;
  });
  commercial.forEach((c) => {
    const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.commercial += c.amount;
  });
  office.forEach((o) => {
    const key = `${o.date.getFullYear()}-${String(o.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.office += o.amount;
  });
  companyPayments.forEach((p) => {
    const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.cogs += p.amount;
  });

  const data = Array.from(map.entries()).map(([month, vals]) => {
    const totalRevenue = vals.domestic + vals.commercial + vals.office;
    return {
      month,
      label: new Date(month + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      domestic: Math.round(vals.domestic),
      commercial: Math.round(vals.commercial),
      office: Math.round(vals.office),
      cogs: Math.round(vals.cogs),
      revenue: Math.round(totalRevenue),
      netProfit: Math.round(totalRevenue - vals.cogs),
    };
  });

  return { data };
}

export async function getExpenseBreakdown(fromStr: string, toStr: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  const expenses = await prisma.expense.findMany({
    where: { agencyId, date: { gte: from, lte: to } },
    select: { category: true, amount: true },
  });

  const map = new Map<string, number>();
  expenses.forEach((e) => {
    const cat = e.category || "General";
    map.set(cat, (map.get(cat) || 0) + e.amount);
  });

  const data = Array.from(map.entries()).map(([name, value]) => ({
    name,
    value: Math.round(value),
  })).sort((a, b) => b.value - a.value);

  return { data };
}

export async function getPhysicalAssets() {
  const session = await getSession();
  if (!session || !session.agencyId) return { assets: [] };
  const agencyId = session.agencyId;

  const assets = await prisma.vehicleAgencyAsset.findMany({
    where: { agencyId },
    orderBy: { registrationDate: "desc" },
    include: {
      reminders: {
        where: { isDismissed: false },
        select: { id: true, type: true, dueDate: true },
      },
    },
  });

  const enrichedAssets = assets.map((a) => {
    let daysLeft: number | null = null;
    let renewalStatus: "normal" | "warning" | "critical" = "normal";

    if (a.nextRenewalDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextRenewal = new Date(a.nextRenewalDate);
      nextRenewal.setHours(0, 0, 0, 0);
      const diffTime = nextRenewal.getTime() - today.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft < 7) {
        renewalStatus = "critical";
      } else if (daysLeft < 30) {
        renewalStatus = "warning";
      }
    }

    return {
      ...a,
      daysLeft,
      renewalStatus,
    };
  });

  return { assets: enrichedAssets };
}

export async function getInventoryValuation() {
  const session = await getSession();
  if (!session || !session.agencyId) return { valuation: [], totalValue: 0 };
  const agencyId = session.agencyId;

  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true, unitCost: true, saleRate: true },
  });

  let totalValue = 0;
  const valuation = [];

  for (const prod of products) {
    const latestStock = await prisma.stockRecord.findFirst({
      where: { agencyId, productId: prod.id },
      orderBy: { date: "desc" },
      select: { closingStock: true },
    });

    const closingStock = latestStock?.closingStock || 0;
    const stockValue = closingStock * prod.unitCost;
    const potentialRevenue = closingStock * prod.saleRate;

    totalValue += stockValue;

    valuation.push({
      id: prod.id,
      name: prod.name,
      closingStock,
      unitCost: prod.unitCost,
      saleRate: prod.saleRate,
      stockValue,
      potentialRevenue,
    });
  }

  return { valuation, totalValue };
}

export async function getPayrollSummary(month: number, year: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };
  const agencyId = session.agencyId;

  const [salaryProfiles, salaryDrawings, salaryAdvances] = await Promise.all([
    // Total configured monthly salaries
    prisma.employeeSalaryProfile.aggregate({
      where: { agencyId },
      _sum: { monthlySalary: true },
    }),
    // Actual drawings / salaries paid for the specific month/year
    prisma.salaryDrawing.aggregate({
      where: { agencyId, month, year },
      _sum: { amount: true },
    }),
    // Outstanding salary advances to recover
    prisma.salaryAdvance.aggregate({
      where: { agencyId, status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { balanceAmount: true },
    }),
  ]);

  return {
    totalSalaryObligation: salaryProfiles._sum.monthlySalary || 0,
    paidThisMonth: salaryDrawings._sum.amount || 0,
    outstandingAdvances: salaryAdvances._sum.balanceAmount || 0,
  };
}

export async function getTopDebtors() {
  const session = await getSession();
  if (!session || !session.agencyId) return { debtors: [] };
  const agencyId = session.agencyId;

  // Let's find customer credit ledger summaries
  const debtors = await prisma.customer.findMany({
    where: { agencyId, isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      creditEntries: {
        select: {
          type: true,
          amount: true,
        },
      },
    },
  });

  const debtorsList = debtors
    .map((c) => {
      const totalDebits = c.creditEntries
        .filter((e) => e.type === "DEBIT")
        .reduce((sum, e) => sum + e.amount, 0);

      const totalCredits = c.creditEntries
        .filter((e) => e.type === "CREDIT")
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = totalDebits - totalCredits;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        type: c.type,
        balance,
      };
    })
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10); // Limit to top 10

  return { debtors: debtorsList };
}

export async function updateAsset(id: string, data: Partial<VehicleAgencyAsset>) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  try {
    const updated = await prisma.vehicleAgencyAsset.update({
      where: { id, agencyId: session.agencyId },
      data,
    });
    revalidatePath("/admin/assets");
    return { asset: updated };
  } catch (err: any) {
    console.error("updateAsset error:", err);
    return { error: "Failed to update asset" };
  }
}

// ── Dedicated Company Payment Summary (plan §Actions) ────────────────────────
export async function getCompanyPaymentSummary(fromStr: string, toStr: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };
  const agencyId = session.agencyId;

  const from = new Date(fromStr);
  const to   = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  const [payments, byProduct] = await Promise.all([
    prisma.companyPayment.aggregate({
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.companyPayment.groupBy({
      by: ["productId"],
      where: { agencyId, date: { gte: from, lte: to } },
      _sum: { amount: true, qtyCylinders: true },
    }),
  ]);

  // Resolve product names
  const productIds = byProduct.map((b) => b.productId).filter(Boolean) as string[];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return {
    totalPaid: payments._sum.amount ?? 0,
    totalCount: payments._count,
    byProduct: byProduct.map((b) => ({
      name: b.productId ? (productMap.get(b.productId) ?? "Unknown") : "Mixed / Multiple",
      amount: b._sum.amount ?? 0,
      qty: b._sum.qtyCylinders ?? 0,
    })),
  };
}

// ── Assets Report PDF Export ──────────────────────────────────────────────────
export async function generateAssetsReport(
  fromStr: string,
  toStr: string
): Promise<{ base64: string; filename: string } | { error: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const from = new Date(fromStr);
  const to   = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  // Gather all data in parallel
  const [
    agency,
    summaryResult,
    companyPaymentsList,
    expensesList,
    salaryList,
    physicalAssets,
    productInventory,
  ] = await Promise.all([
    prisma.agency.findUnique({ where: { id: agencyId }, select: { name: true } }),
    getFinancialSummary(fromStr, toStr),
    prisma.companyPayment.findMany({
      where: { agencyId, date: { gte: from, lte: to } },
      include: { product: { select: { name: true } }, addedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { agencyId, date: { gte: from, lte: to } },
      include: { addedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.salaryDrawing.findMany({
      where: { agencyId, date: { gte: from, lte: to } },
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.vehicleAgencyAsset.findMany({
      where: { agencyId, isActive: true },
      orderBy: { registrationDate: "desc" },
    }),
    prisma.product.findMany({
      where: { agencyId, isActive: true },
      select: { id: true, name: true, unitCost: true, saleRate: true },
    }),
  ]);

  const agencyName = agency?.name ?? "Gas Agency";
  const dateLabel  = `${fromStr} to ${toStr}`;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { jsPDF } = require("jspdf");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const fmt = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pageW = doc.internal.pageSize.width;

  function addPageHeader(title: string) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(agencyName, 14, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${title} | ${dateLabel}`, 14, 21);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageW - 14, 14, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.line(14, 24, pageW - 14, 24);
  }

  // ── Page 1: P&L Statement ─────────────────────────────────────────────────
  addPageHeader("Assets & Finance Report — P&L Statement");

  const s = "error" in summaryResult ? null : summaryResult.summary!;
  if (s) {
    autoTable(doc, {
      startY: 28,
      head: [["Line Item", "Amount (₹)"]],
      body: [
        ["Revenue — Domestic Sales", fmt(s.domesticRevenue)],
        ["Revenue — Commercial Sales", fmt(s.commercialRevenue)],
        ["Revenue — Office Transactions", fmt(s.officeRevenue)],
        ["TOTAL REVENUE", fmt(s.totalRevenue)],
        ["(-) COGS — Company Payments to Oil Co.", fmt(s.totalCOGS)],
        ["= GROSS PROFIT", fmt(s.grossProfit)],
        ["(-) Operating Expenses", fmt(s.operationalExpenses)],
        ["(-) Payroll Drawings", fmt(s.payrollExpenses)],
        ["= NET PROFIT / (LOSS)", fmt(s.netProfit)],
        ["Outstanding Receivables (Udhari)", fmt(s.totalReceivables)],
        ["Physical Assets Value", fmt(s.physicalAssetsValue)],
        ["Cash on Hand (Last Closing)", fmt(s.cashOnHand)],
      ],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      bodyStyles: { textColor: [30, 30, 30] },
      didParseCell: (data: any) => {
        const boldRows = [3, 5, 8];
        if (boldRows.includes(data.row.index) && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249];
        }
        if (data.row.index === 8 && data.section === "body") {
          data.cell.styles.fillColor = s.netProfit >= 0 ? [220, 252, 231] : [254, 226, 226];
        }
      },
    });
  }

  // ── Page 2: Company Payments ──────────────────────────────────────────────
  doc.addPage();
  addPageHeader("Company Payments — COGS Ledger");

  autoTable(doc, {
    startY: 28,
    head: [["Date", "Oil Company", "Invoice No.", "UTR/Ref", "Product", "Qty", "Amount (₹)", "Mode", "Recorded By"]],
    body: companyPaymentsList.map((p) => [
      new Date(p.date).toLocaleDateString("en-IN"),
      p.oilCompany ?? "—",
      p.invoiceNo ?? "—",
      p.referenceNo ?? "—",
      p.product?.name ?? "Mixed",
      String(p.qtyCylinders ?? "—"),
      fmt(p.amount),
      p.paymentMode,
      p.addedBy.name,
    ]),
    foot: [["", "", "", "", "", "TOTAL", fmt(companyPaymentsList.reduce((s, p) => s + p.amount, 0)), "", ""]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [185, 28, 28], textColor: 255 },
    footStyles: { fillColor: [254, 226, 226], fontStyle: "bold" },
  });

  // ── Page 3: Expenses ──────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader("Operating Expenses Breakdown");

  autoTable(doc, {
    startY: 28,
    head: [["Date", "Description", "Category", "Amount (₹)", "Added By"]],
    body: expensesList.map((e) => [
      new Date(e.date).toLocaleDateString("en-IN"),
      e.description,
      e.category ?? "General",
      fmt(e.amount),
      e.addedBy.name,
    ]),
    foot: [["", "TOTAL EXPENSES", "", fmt(expensesList.reduce((s, e) => s + e.amount, 0)), ""]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    footStyles: { fillColor: [237, 233, 254], fontStyle: "bold" },
  });

  // ── Page 4: Payroll ───────────────────────────────────────────────────────
  if (salaryList.length > 0) {
    doc.addPage();
    addPageHeader("Payroll & Salary Drawings");

    autoTable(doc, {
      startY: 28,
      head: [["Date", "Employee", "Type", "Amount (₹)", "Month", "Year"]],
      body: salaryList.map((d) => [
        new Date(d.date).toLocaleDateString("en-IN"),
        d.employee.name,
        d.type,
        fmt(d.amount),
        String(d.month),
        String(d.year),
      ]),
      foot: [["", "TOTAL PAYROLL", "", fmt(salaryList.reduce((s, d) => s + d.amount, 0)), "", ""]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [2, 132, 199], textColor: 255 },
      footStyles: { fillColor: [224, 242, 254], fontStyle: "bold" },
    });
  }

  // ── Page 5: Physical Assets ───────────────────────────────────────────────
  if (physicalAssets.length > 0) {
    doc.addPage();
    addPageHeader("Physical Assets Registry");

    autoTable(doc, {
      startY: 28,
      head: [["Asset Name", "Type", "Registered", "Last Renewal", "Next Renewal", "Value (₹)"]],
      body: physicalAssets.map((a) => [
        a.name,
        a.assetType,
        new Date(a.registrationDate).toLocaleDateString("en-IN"),
        a.lastRenewalDate ? new Date(a.lastRenewalDate).toLocaleDateString("en-IN") : "—",
        a.nextRenewalDate ? new Date(a.nextRenewalDate).toLocaleDateString("en-IN") : "—",
        fmt(a.price),
      ]),
      foot: [["TOTAL VALUE", "", "", "", "", fmt(physicalAssets.reduce((s, a) => s + a.price, 0))]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255 },
      footStyles: { fillColor: [204, 251, 241], fontStyle: "bold" },
    });
  }

  // ── Footer on all pages ───────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `Page ${i} of ${pageCount}  |  ${agencyName} — Assets & Finance Report  |  GasAgency Platform`,
      14,
      doc.internal.pageSize.height - 6
    );
  }

  const pdfBytes = doc.output("arraybuffer") as ArrayBuffer;
  const base64   = Buffer.from(pdfBytes).toString("base64");
  const filename = `assets-report-${fromStr}-to-${toStr}.pdf`;

  return { base64, filename };
}
