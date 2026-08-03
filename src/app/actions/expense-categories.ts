"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Get all expense categories ────────────────────────────────────────────────
export async function getExpenseCategories() {
  const session = await getSession();
  if (!session || !session.agencyId) return { categories: [] };

  const categories = await prisma.expenseCategory.findMany({
    where: { agencyId: session.agencyId, isActive: true },
    orderBy: { name: "asc" },
  });

  return { categories };
}

// ── Create expense category ───────────────────────────────────────────────────
export async function createExpenseCategory(data: {
  name: string;
  monthlyBudget?: number;
  color?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };
  if (!data.name?.trim()) return { error: "Category name is required" };

  try {
    const category = await prisma.expenseCategory.create({
      data: {
        agencyId: session.agencyId,
        name: data.name.trim(),
        monthlyBudget: data.monthlyBudget ?? 0,
        color: data.color ?? null,
      },
    });
    revalidatePath("/admin/expenses");
    return { category };
  } catch {
    return { error: "A category with that name already exists" };
  }
}

// ── Update expense category ───────────────────────────────────────────────────
export async function updateExpenseCategory(
  id: string,
  data: { name?: string; monthlyBudget?: number; color?: string }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const category = await prisma.expenseCategory.update({
    where: { id, agencyId: session.agencyId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.monthlyBudget !== undefined ? { monthlyBudget: data.monthlyBudget } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
  });

  revalidatePath("/admin/expenses");
  return { category };
}

// ── Delete (deactivate) expense category ─────────────────────────────────────
export async function deleteExpenseCategory(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  await prisma.expenseCategory.update({
    where: { id, agencyId: session.agencyId },
    data: { isActive: false },
  });

  revalidatePath("/admin/expenses");
  return { success: true };
}

// ── Get budget vs actual for current month ────────────────────────────────────
export async function getBudgetVsActual(month?: number, year?: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { data: [] };

  const m = month ?? new Date().getMonth() + 1;
  const y = year ?? new Date().getFullYear();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);

  const [categories, expenses] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { agencyId: session.agencyId, date: { gte: start, lte: end } },
      select: { amount: true, categoryId: true, category: true },
    }),
  ]);

  // Tally spend per category
  const spendMap = new Map<string, number>();
  let uncategorizedSpend = 0;
  expenses.forEach((e) => {
    let catId = e.categoryId;
    if (!catId && e.category) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === e.category.toLowerCase()
      );
      if (match) catId = match.id;
    }

    if (catId) {
      spendMap.set(catId, (spendMap.get(catId) ?? 0) + e.amount);
    } else {
      uncategorizedSpend += e.amount;
    }
  });

  const data = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    color: cat.color ?? "#6366F1",
    budget: cat.monthlyBudget,
    actual: Math.round(spendMap.get(cat.id) ?? 0),
    remaining: cat.monthlyBudget > 0
      ? Math.round(cat.monthlyBudget - (spendMap.get(cat.id) ?? 0))
      : null,
    pct: cat.monthlyBudget > 0
      ? Math.round(((spendMap.get(cat.id) ?? 0) / cat.monthlyBudget) * 100)
      : null,
    overspent:
      cat.monthlyBudget > 0 && (spendMap.get(cat.id) ?? 0) > cat.monthlyBudget,
  }));

  return { data, uncategorizedSpend: Math.round(uncategorizedSpend) };
}

// ── Seed default categories for a new agency ─────────────────────────────────
export async function seedDefaultCategories() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const defaults = [
    { name: "Fuel", color: "#F59E0B" },
    { name: "Vehicle Maintenance", color: "#EF4444" },
    { name: "Office Supplies", color: "#3B82F6" },
    { name: "Utilities", color: "#8B5CF6" },
    { name: "Staff Welfare", color: "#10B981" },
    { name: "Marketing", color: "#EC4899" },
    { name: "Miscellaneous", color: "#6B7280" },
  ];

  await prisma.expenseCategory.createMany({
    data: defaults.map((d) => ({ ...d, agencyId: session.agencyId! })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/expenses");
  return { success: true };
}
