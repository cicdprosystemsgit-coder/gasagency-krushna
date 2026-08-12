import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { getBudgetVsActual, getExpenseCategories } from "@/app/actions/expense-categories";
import { prisma } from "@/lib/prisma";
import { ExpenseCategoriesClient } from "./ExpenseCategoriesClient";

export default async function ExpenseCategoriesPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  requireFeature(session, "expense_categories");

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