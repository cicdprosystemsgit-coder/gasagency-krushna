import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { ExpensesClient } from "./ExpensesClient";
import { getBudgetVsActual } from "@/app/actions/expense-categories";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) redirect("/login");
  requireFeature(session, "expenses");

  // Fetch user profile info
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  });

  if (!user) redirect("/login");

  const [expenses, assets, categories, budgetResult] = await Promise.all([
    prisma.expense.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { date: "desc" },
      take: 100,
      include: { addedBy: { select: { name: true } } },
    }),
    prisma.vehicleAgencyAsset.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expenseCategory.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    getBudgetVsActual(),
  ]);

  return (
    <div>
      <PageHeader
        title="Expenses & Asset Management"
        subtitle="Track agency operational ledger, category budgets, and asset renewals"
        icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
      />
      <ExpensesClient
        initialExpenses={expenses as any}
        initialAssets={assets}
        canEdit={session.role === "ADMIN"}
        userId={session.userId}
        user={{ name: user.name, email: user.email, role: user.role }}
        categories={categories as any}
        budgetData={budgetResult.data}
        uncategorizedSpend={budgetResult.uncategorizedSpend ?? 0}
      />
    </div>
  );
}