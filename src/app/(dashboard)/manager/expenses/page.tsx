import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt } from "lucide-react";
import { getAgencyEmployeeExpensesForManager } from "@/app/actions/expenses";
import { getBudgetVsActual } from "@/app/actions/expense-categories";
import ExpenseApprovalsClient from "./ExpenseApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ManagerExpensesPage() {
  const session = await getSession();
  if (!session || !["MANAGER", "ADMIN"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  // Fetch user profile info
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  });

  if (!user) redirect("/login");

  // Fetch categories, team approval requests & category budget calculations
  const [categories, { expenses: teamExpenses }, budgetResult] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    getAgencyEmployeeExpensesForManager(),
    getBudgetVsActual(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Expense Approvals & Budgets"
        subtitle="Review, approve, or reject expense claims and track category spending"
        icon={<Receipt className="w-5 h-5 text-blue-600" />}
      />
      <ExpenseApprovalsClient
        initialExpenses={teamExpenses as any}
        user={{ name: user.name, email: user.email, role: user.role }}
        categories={categories as any}
        budgetData={budgetResult.data}
        uncategorizedSpend={budgetResult.uncategorizedSpend ?? 0}
      />
    </div>
  );
}
