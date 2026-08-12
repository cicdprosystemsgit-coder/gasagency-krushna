import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { DashboardClient } from "./DashboardClient";

export default async function AccountsDashboardPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  requireFeature(session, "finance_dashboard");

  // Fetch all active accounts
  const accounts = await prisma.personalAccount.findMany({
    where: { agencyId: session.agencyId, isActive: true },
  });

  // Fetch all transactions (limit to last 1000 for trend analysis)
  const transactions = await prisma.personalTransaction.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { date: "desc" },
    take: 1000,
  });

  // Fetch udhaari list
  const udhaariList = await prisma.personalUdhaari.findMany({
    where: { agencyId: session.agencyId },
    include: {
      recoveries: true,
    },
  });

  // Fetch salary drawings for current year
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const salaryDrawings = await prisma.salaryDrawing.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: startOfYear },
    },
    include: {
      employee: { select: { name: true } },
    },
  });

  // Fetch oil company payments for current year
  const companyPayments = await prisma.companyPayment.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: startOfYear },
    },
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts
        </Link>
      </div>

      <PageHeader
        title="Finance Dashboard"
        subtitle="Overview of personal net worth, agency cash flows, udhaari balances, and business drawings"
        icon={<LayoutDashboard className="w-5 h-5" />}
      />

      <DashboardClient
        accounts={accounts}
        transactions={transactions}
        udhaariList={udhaariList}
        salaryDrawings={salaryDrawings}
        companyPayments={companyPayments}
      />
    </div>
  );
}