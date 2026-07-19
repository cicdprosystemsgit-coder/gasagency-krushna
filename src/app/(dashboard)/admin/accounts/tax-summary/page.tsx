import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Percent, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTaxSummary } from "@/app/actions/tax-summary";
import { TaxSummaryClient } from "./TaxSummaryClient";

interface PageProps {
  searchParams: Promise<{ fy?: string }>;
}

export default async function TaxSummaryPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");

  // Determine default financial year
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFY = `${startYear}-${(startYear + 1).toString().slice(-2)}`;

  const params = await searchParams;
  const financialYear = params.fy || defaultFY;

  const data = await getTaxSummary(financialYear);

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
        title="Tax & ITR Summary"
        subtitle="Consolidated financial year statement for accounting and tax audits"
        icon={<Percent className="w-6 h-6 text-indigo-600" />}
      />

      <TaxSummaryClient initialData={data} defaultFY={financialYear} />
    </div>
  );
}
