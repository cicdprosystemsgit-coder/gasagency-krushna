"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Analytics: Revenue trend (last N months) ────────────────────────────────
export async function getRevenueTrend(months = 6) {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { agencyId, date: { gte: since } },
    select: { date: true, cashCollected: true },
  });
  const commercial = await prisma.commercialSale.findMany({
    where: { agencyId, date: { gte: since } },
    select: { date: true, amount: true },
  });

  // Group by YYYY-MM
  const map = new Map<string, { revenue: number; commercial: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { revenue: 0, commercial: 0 });
  }

  deliveries.forEach((d) => {
    const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.revenue += d.cashCollected;
  });
  commercial.forEach((c) => {
    const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.get(key)!.commercial += c.amount;
  });

  const data = Array.from(map.entries()).map(([month, vals]) => ({
    month,
    label: new Date(month + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
    domestic: Math.round(vals.revenue),
    commercial: Math.round(vals.commercial),
    total: Math.round(vals.revenue + vals.commercial),
  }));

  return { data };
}

// ── Analytics: Product-wise sales (this month) ──────────────────────────────
export async function getProductSales() {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { agencyId, date: { gte: start } },
    select: { deliveredQty: true, cashCollected: true, product: { select: { name: true } } },
  });

  const map = new Map<string, { qty: number; revenue: number }>();
  deliveries.forEach((d) => {
    const name = d.product.name;
    if (!map.has(name)) map.set(name, { qty: 0, revenue: 0 });
    map.get(name)!.qty += d.deliveredQty;
    map.get(name)!.revenue += d.cashCollected;
  });

  const data = Array.from(map.entries())
    .map(([name, vals]) => ({ name, qty: vals.qty, revenue: Math.round(vals.revenue) }))
    .sort((a, b) => b.qty - a.qty);

  return { data };
}

// ── Analytics: Delivery boy performance (this month) ────────────────────────
export async function getDeliveryBoyPerformance() {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const deliveryBoys = await prisma.user.findMany({
    where: { agencyId, role: "DELIVERY_BOY", isActive: true },
    select: { id: true, name: true },
  });

  const targets = await prisma.deliveryTarget.findMany({
    where: {
      agencyId,
      month: start.getMonth() + 1,
      year: start.getFullYear(),
    },
    select: { employeeId: true, targetQty: true, achievedQty: true },
  });

  const targetMap = new Map(targets.map((t) => [t.employeeId, t]));

  const records = await prisma.deliveryRecord.findMany({
    where: { agencyId, date: { gte: start } },
    select: { deliveredById: true, deliveredQty: true, cashCollected: true },
  });

  const perfMap = new Map<string, { qty: number; cash: number }>();
  records.forEach((r) => {
    if (!perfMap.has(r.deliveredById)) perfMap.set(r.deliveredById, { qty: 0, cash: 0 });
    perfMap.get(r.deliveredById)!.qty += r.deliveredQty;
    perfMap.get(r.deliveredById)!.cash += r.cashCollected;
  });

  const data = deliveryBoys.map((db) => {
    const perf = perfMap.get(db.id) ?? { qty: 0, cash: 0 };
    const target = targetMap.get(db.id);
    return {
      name: db.name,
      delivered: perf.qty,
      cashCollected: Math.round(perf.cash),
      target: target?.targetQty ?? 0,
      achievement: target?.targetQty ? Math.round((perf.qty / target.targetQty) * 100) : null,
    };
  }).sort((a, b) => b.delivered - a.delivered);

  return { data };
}

// ── Analytics: Top 10 customers by volume ───────────────────────────────────
export async function getTopCustomers() {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const records = await prisma.deliveryRecord.findMany({
    where: { agencyId, date: { gte: start } },
    select: {
      customerId: true,
      deliveredQty: true,
      cashCollected: true,
      customer: { select: { name: true } },
    },
  });

  const map = new Map<string, { name: string; qty: number; cash: number }>();
  records.forEach((r) => {
    if (!map.has(r.customerId))
      map.set(r.customerId, { name: r.customer.name, qty: 0, cash: 0 });
    map.get(r.customerId)!.qty += r.deliveredQty;
    map.get(r.customerId)!.cash += r.cashCollected;
  });

  const data = Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map((c) => ({ ...c, cash: Math.round(c.cash) }));

  return { data };
}

// ── Analytics: P&L Summary (this month) ─────────────────────────────────────
export async function getPLSummary() {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: null };
  const agencyId = session.agencyId;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [deliveries, commercial, expenses, products] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where: { agencyId, date: { gte: start } },
      select: { deliveredQty: true, cashCollected: true, product: { select: { unitCost: true, saleRate: true } } },
    }),
    prisma.commercialSale.findMany({
      where: { agencyId, date: { gte: start } },
      select: { amount: true, qty: true, product: { select: { unitCost: true } } },
    }),
    prisma.expense.findMany({
      where: { agencyId, date: { gte: start } },
      select: { amount: true, category: true },
    }),
    prisma.product.findMany({
      where: { agencyId, isActive: true },
      select: { id: true, unitCost: true, saleRate: true },
    }),
  ]);

  const domesticRevenue = deliveries.reduce((s, d) => s + d.cashCollected, 0);
  const domesticCOGS = deliveries.reduce((s, d) => s + d.deliveredQty * d.product.unitCost, 0);
  const commercialRevenue = commercial.reduce((s, c) => s + c.amount, 0);
  const commercialCOGS = commercial.reduce((s, c) => s + c.qty * c.product.unitCost, 0);
  const totalRevenue = domesticRevenue + commercialRevenue;
  const totalCOGS = domesticCOGS + commercialCOGS;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    data: {
      totalRevenue: Math.round(totalRevenue),
      totalCOGS: Math.round(totalCOGS),
      grossProfit: Math.round(grossProfit),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
      netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
      expenseByCategory,
      domesticRevenue: Math.round(domesticRevenue),
      commercialRevenue: Math.round(commercialRevenue),
    },
  };
}

// ── Analytics: Inventory turnover ───────────────────────────────────────────
export async function getInventoryTurnover() {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };
  const agencyId = session.agencyId;

  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const stocks = await prisma.stockRecord.findMany({
    where: { agencyId, date: { gte: start } },
    select: {
      date: true,
      loadingIn: true,
      salesQty: true,
      closingStock: true,
      product: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Group by month
  const map = new Map<string, { inflow: number; outflow: number }>();
  stocks.forEach((s) => {
    const key = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { inflow: 0, outflow: 0 });
    map.get(key)!.inflow += s.loadingIn;
    map.get(key)!.outflow += s.salesQty;
  });

  const data = Array.from(map.entries()).map(([month, vals]) => ({
    month,
    label: new Date(month + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
    inflow: vals.inflow,
    outflow: vals.outflow,
  }));

  return { data };
}
