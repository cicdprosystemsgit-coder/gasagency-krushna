import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { ExpensesClient } from "@/app/(dashboard)/admin/expenses/ExpensesClient";

export default async function ManagerExpensesPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const [expenses, assets] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: { addedBy: { select: { name: true } } },
    }),
    prisma.vehicleAgencyAsset.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Expenses & Vehicles"
        subtitle="Track daily expenses and asset renewal schedule"
        icon={<BarChart3 className="w-5 h-5" />}
      />
      <ExpensesClient
        initialExpenses={expenses as Parameters<typeof ExpensesClient>[0]["initialExpenses"]}
        initialAssets={assets}
        canEdit={false}
        userId={session.userId}
      />
    </div>
  );
}
