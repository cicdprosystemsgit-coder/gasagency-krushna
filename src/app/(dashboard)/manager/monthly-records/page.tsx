import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FileSpreadsheet } from "lucide-react";
import { MonthlyMasterClient } from "../../admin/monthly-records/MonthlyMasterClient";
import { getMonthlyMasterSheet } from "@/app/actions/monthly-records";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function ManagerMonthlyRecordsPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
    redirect("/login");
  }

  requireFeature(session, session.enabledFeatures.includes("monthly_records") ? "monthly_records" : "stock");

  const resolvedParams = await searchParams;
  const now = new Date();
  const year = resolvedParams?.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();
  const month = resolvedParams?.month ? parseInt(resolvedParams.month, 10) : now.getMonth() + 1;

  const sheetData = await getMonthlyMasterSheet(year, month);
  if ("error" in sheetData) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
        Failed to load monthly records: {sheetData.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Records (मासिक हिशोब)"
        subtitle="Complete monthly master ledger: P&L cash statement, advances & salary, credit accounts, cylinder distribution, stock & fleet expenses"
        icon={<FileSpreadsheet className="w-5 h-5 text-blue-600" />}
      />

      <MonthlyMasterClient
        initialData={sheetData}
        userRole={session.role}
      />
    </div>
  );
}

