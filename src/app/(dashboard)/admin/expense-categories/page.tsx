import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBudgetVsActual, getExpenseCategories } from "@/app/actions/expense-categories";
import { prisma } from "@/lib/prisma";
import { ExpenseCategoriesClient } from "./ExpenseCategoriesClient";

export default async function ExpenseCategoriesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");

  const [budgetResult, categoriesResult, recentExpenses] = await Promise.all([
    getBudgetVsActual(),
    getExpenseCategories(),
    prisma.expense.findMany({
      where: { agencyId: session.agencyId, date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      include: { addedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <ExpenseCategoriesClient
      budgetData={budgetResult.data}
      uncategorizedSpend={budgetResult.uncategorizedSpend ?? 0}
      categories={categoriesResult.categories}
      expenses={JSON.parse(JSON.stringify(recentExpenses))}
    />
  );
}
