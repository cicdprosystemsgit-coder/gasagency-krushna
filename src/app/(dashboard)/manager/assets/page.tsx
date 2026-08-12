import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PieChart } from "lucide-react";
import { AssetsManagementClient } from "../../admin/assets/AssetsManagementClient";
import {
  getFinancialSummary,
  getRevenueAndCOGSBreakdown,
  getExpenseBreakdown,
  getPhysicalAssets,
  getInventoryValuation,
  getPayrollSummary,
  getTopDebtors,
} from "@/app/actions/assets";

export default async function AssetsManagementPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = now.toISOString().split("T")[0];

  // Parallel data fetching via actions
  const [
    summaryResult,
    trendResult,
    expenseResult,
    assetsResult,
    inventoryResult,
    payrollResult,
    debtorsResult,
    products,
    recentPayments,
  ] = await Promise.all([
    getFinancialSummary(from, to),
    getRevenueAndCOGSBreakdown(6),
    getExpenseBreakdown(from, to),
    getPhysicalAssets(),
    getInventoryValuation(),
    getPayrollSummary(now.getMonth() + 1, now.getFullYear()),
    getTopDebtors(),
    prisma.product.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.companyPayment.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
      },
    }),
  ]);

  if ("error" in summaryResult) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader
        title="Assets & Finance Command"
        subtitle="Holistic enterprise overview of agency assets, P&L, inventory valuation, and cash flow."
        icon={<PieChart className="w-5 h-5" />}
      />
      <AssetsManagementClient
        initialSummary={summaryResult.summary!}
        initialTrend={trendResult.data}
        initialExpenses={expenseResult.data}
        initialAssets={assetsResult.assets as any}
        initialInventory={inventoryResult.valuation}
        initialTotalInventoryValue={inventoryResult.totalValue}
        initialPayroll={payrollResult as any}
        initialDebtors={debtorsResult.debtors}
        recentPayments={recentPayments as any}
        products={products}
        canEdit={session.role === "ADMIN"}
        defaultFrom={from}
        defaultTo={to}
      />
    </div>
  );
}