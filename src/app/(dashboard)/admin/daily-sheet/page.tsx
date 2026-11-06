import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Calculator } from "lucide-react";
import { DailySheetClient } from "./DailySheetClient";
import { getDailySheetData } from "@/app/actions/daily-sheet";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AdminDailySheetPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER", "GODOWN_KEEPER", "STAFF"].includes(session.role)) {
    redirect("/login");
  }

  // Feature gate: fallback to "stock" feature if daily_sheet isn't explicitly configured
  requireFeature(session, session.enabledFeatures.includes("daily_sheet") ? "daily_sheet" : "stock");

  const resolvedParams = await searchParams;
  const targetDate = resolvedParams?.date || new Date().toISOString().slice(0, 10);

  const sheetData = await getDailySheetData(targetDate);
  if ("error" in sheetData) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
        Failed to load daily sheet: {sheetData.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Sheet & Cylinder Calculator"
        subtitle="Live reconciliation of allocated, delivered, empty returned, full returned, and shortage counts"
        icon={<Calculator className="w-5 h-5 text-blue-600" />}
      />

      <DailySheetClient
        initialData={sheetData}
        selectedDate={targetDate}
        userRole={session.role}
      />
    </div>
  );
}

