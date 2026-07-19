"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  Building,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
  Activity,
  AlertCircle
} from "lucide-react";

interface TaxSummaryClientProps {
  initialData: any;
  defaultFY: string;
}

export function TaxSummaryClient({ initialData, defaultFY }: TaxSummaryClientProps) {
  const router = useRouter();
  const [fy, setFy] = useState(defaultFY);
  const [isPending, startTransition] = useTransition();

  const handleFYChange = (newFy: string) => {
    setFy(newFy);
    startTransition(() => {
      router.push(`/admin/accounts/tax-summary?fy=${newFy}`);
    });
  };

  if (initialData.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-800 mb-1">Error Generating Summary</h3>
        <p className="text-sm text-red-600 mb-4">{initialData.error}</p>
        <button
          onClick={() => handleFYChange(defaultFY)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Reset to Current FY
        </button>
      </div>
    );
  }

  const { metrics, expensesByCategory, fdInterestDetails, loanDetails, fyStart, fyEnd } = initialData;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `GAS AGENCY TAX & ITR SUMMARY - FY ${fy}\n`;
    csvContent += `Period: ${fyStart} to ${fyEnd}\n\n`;

    // 1. Core Summary Metrics
    csvContent += "SUMMARY METRICS\n";
    csvContent += `Total Gross Revenue,${metrics.totalRevenue}\n`;
    csvContent += `Cost of Cylinder Stock (COGS),${metrics.totalCogs}\n`;
    csvContent += `Gross Profit,${metrics.grossProfit}\n`;
    csvContent += `Gross Profit Margin (%),${metrics.grossMargin.toFixed(2)}\n`;
    csvContent += `Staff Salaries & Bonuses,${metrics.totalSalaries}\n`;
    csvContent += `Operating Expenses,${metrics.totalExpenses}\n`;
    csvContent += `Bad Debts Written Off,${metrics.totalBadDebts}\n`;
    csvContent += `Total Operating Expenses,${metrics.totalOperatingExpenses}\n`;
    csvContent += `Net Taxable Profit,${metrics.netProfit}\n`;
    csvContent += `Net Profit Margin (%),${metrics.netMargin.toFixed(2)}\n`;
    csvContent += `Owner Drawings,${metrics.totalDrawings}\n`;
    csvContent += `FD/RD Interest Earned,${metrics.totalFdInterest}\n`;
    csvContent += `Loan EMIs Paid,${metrics.totalEmiPaid}\n`;
    csvContent += `Loan Penalty/Interest Paid,${metrics.totalPenaltyPaid}\n`;
    csvContent += `Total GST Collected,${metrics.totalGstCollected}\n`;
    csvContent += `GST Invoices Count,${metrics.gstTotalInvoices}\n\n`;

    // 2. Revenue breakdown
    csvContent += "REVENUE BREAKDOWN\n";
    csvContent += `Refill Deliveries,${metrics.revenueDeliveries}\n`;
    csvContent += `Commercial Sales,${metrics.revenueCommercial}\n`;
    csvContent += `Office/Accessory Sales,${metrics.revenueOffice}\n\n`;

    // 3. Category Expenses
    csvContent += "OPERATING EXPENSES BY CATEGORY\n";
    csvContent += "Category,Amount\n";
    expensesByCategory.forEach((exp: any) => {
      csvContent += `"${exp.category}",${exp.amount}\n`;
    });
    csvContent += "\n";

    // 4. FD Details
    csvContent += "FIXED DEPOSIT INTEREST BREAKDOWN\n";
    csvContent += "Bank Name,Reference ID,Principal,Interest Rate (%),Overlap Days in Period,Interest Earned\n";
    fdInterestDetails.forEach((fd: any) => {
      csvContent += `"${fd.bankName}","${fd.accountRef}",${fd.principal},${fd.rate},${fd.daysInPeriod},${fd.interestEarned}\n`;
    });
    csvContent += "\n";

    // 5. Loan Details
    csvContent += "LOAN & EMI REPAYMENTS\n";
    csvContent += "Bank Name,Loan Ref ID,Principal Amount,Interest Rate (%),EMI Paid,Penalty/Additional Interest Paid\n";
    loanDetails.forEach((l: any) => {
      csvContent += `"${l.bankName}","${l.loanRef}",${l.principal},${l.rate},${l.emiPaidAmount},${l.penaltyPaidAmount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tax_Summary_FY_${fy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const yearsList = ["2023-24", "2024-25", "2025-26", "2026-27", "2027-28"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Printable Sheet Head (Hidden in Screen view, Visible in Print view) */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-5 mb-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">ITR Consolidated Financial Statement</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Financial Year: 20{fy}</p>
            <p className="text-[11px] text-slate-400">Statement Period: {fyStart} to {fyEnd}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">GAS AGENCY FINANCE</h2>
            <p className="text-xs text-slate-500">Tax Audit Ledger</p>
          </div>
        </div>
      </div>

      {/* Screen Controls & Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-2xl">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Assessment Period</label>
            <div className="relative inline-block mt-0.5">
              <select
                value={fy}
                onChange={(e) => handleFYChange(e.target.value)}
                disabled={isPending}
                className="appearance-none pr-8 pl-1 py-0.5 bg-transparent border-none text-slate-700 text-sm font-bold focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    Financial Year 20{y}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold shadow-sm shadow-indigo-100 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top metrics grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Widget */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Gross Agency Revenue</p>
              <h3 className="text-3xl font-extrabold text-emerald-950 mt-2">{formatCurrency(metrics.totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-800">
            <span className="font-semibold">{metrics.gstTotalInvoices} Tax Invoices</span>
            <span className="text-emerald-500">|</span>
            <span>Incl. Cash & Credit Refills</span>
          </div>
        </div>

        {/* Cost of Cylinders (COGS) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cost of Cylinders (COGS)</p>
              <h3 className="text-3xl font-extrabold text-rose-950 mt-2">{formatCurrency(metrics.totalCogs)}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-700">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-rose-800">
            <span className="font-bold">GP Margin: {metrics.grossMargin.toFixed(1)}%</span>
            <span className="text-rose-500">|</span>
            <span>Gross Profit: {formatCurrency(metrics.grossProfit)}</span>
          </div>
        </div>

        {/* Net Taxable Profit */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Taxable Profit</p>
              <h3 className="text-3xl font-extrabold text-indigo-950 mt-2">{formatCurrency(metrics.netProfit)}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-700">
              <Percent className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-800">
            <span className="font-bold">Net Margin: {metrics.netMargin.toFixed(1)}%</span>
            <span className="text-indigo-500">|</span>
            <span>Target Range: 8% - 12%</span>
          </div>
        </div>
      </div>

      {/* Structured breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Sources Breakdown */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              Revenue Streams Breakdown
            </h4>
            <span className="text-xs font-bold text-slate-400">Consolidated</span>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Refill Deliveries Collection</p>
                <p className="text-[10px] text-slate-400">Domestic gas refill invoices</p>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{formatCurrency(metrics.revenueDeliveries)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Commercial Refills Sales</p>
                <p className="text-[10px] text-slate-400">19kg cylinders and bulk business sales</p>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{formatCurrency(metrics.revenueCommercial)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-slate-700">Office Connections & Regulator Sales</p>
                <p className="text-[10px] text-slate-400">New connections, pipes, stove service fees</p>
              </div>
              <span className="text-sm font-extrabold text-slate-800">{formatCurrency(metrics.revenueOffice)}</span>
            </div>
          </div>
        </div>

        {/* GST Invoicing Ledger */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-full"></span>
              GST Collection Ledger
            </h4>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Active Invoices</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">GST Taxable Value</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.gstSubtotal)}</p>
            </div>
            <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-indigo-600 uppercase">GST Amount Collected</p>
              <p className="text-lg font-extrabold text-indigo-800 mt-1">{formatCurrency(metrics.totalGstCollected)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
            <span>Total Invoices Generated: <strong className="text-slate-800">{metrics.gstTotalInvoices}</strong></span>
            <span>Combined Total: <strong className="text-slate-800">{formatCurrency(metrics.gstSubtotal + metrics.totalGstCollected)}</strong></span>
          </div>
        </div>
      </div>

      {/* Operating Expenses list */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-rose-500 rounded-full"></span>
            Operating & Administrative Costs
          </h4>
          <span className="text-xs font-bold text-slate-400">Total: {formatCurrency(metrics.totalOperatingExpenses)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Staff Salaries & Bonuses</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalSalaries)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Excludes owner drawings</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Office Expenses</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalExpenses)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Rent, fuel, maintenance, billing</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Bad Debts Written Off</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalBadDebts)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Unrecoverable personal udhaari</p>
          </div>
        </div>

        {/* Expenses category breakdown list */}
        {expensesByCategory.length > 0 ? (
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-600 mb-2">Category Breakdown</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {expensesByCategory.map((exp: any) => (
                <div key={exp.category} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">{exp.category}</span>
                  <span className="font-bold text-slate-800">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No itemized category expenses logged during this period.</p>
        )}
      </div>

      {/* Non-Operating Capital & Investments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capital Drawings */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
            <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span>
            Owner Draw Pool (Capital Outflow)
          </h4>
          <div className="p-4 bg-amber-50 rounded-2xl">
            <p className="text-[10px] font-bold text-amber-800 uppercase">Total YTD Drawings</p>
            <p className="text-2xl font-extrabold text-amber-950 mt-1">{formatCurrency(metrics.totalDrawings)}</p>
            <p className="text-[10px] text-amber-700 mt-1.5">Capital withdrawals for personal usage (not tax-deductible expense)</p>
          </div>
        </div>

        {/* FD Interest Earnings */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-full"></span>
              Fixed Deposit (FD/RD) Interest Income
            </h4>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              +{formatCurrency(metrics.totalFdInterest)} Earned
            </span>
          </div>

          {fdInterestDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                    <th className="pb-2">Bank & Ref ID</th>
                    <th className="pb-2 text-right">Principal</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Active Days</th>
                    <th className="pb-2 text-right">Interest Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fdInterestDetails.map((fd: any, idx: number) => (
                    <tr key={idx} className="text-slate-700 font-medium">
                      <td className="py-2.5">
                        <p className="font-bold text-slate-800">{fd.bankName}</p>
                        <p className="text-[10px] text-slate-400">Ref: {fd.accountRef}</p>
                      </td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(fd.principal)}</td>
                      <td className="py-2.5 text-right font-semibold">{fd.rate}%</td>
                      <td className="py-2.5 text-right">{fd.daysInPeriod} days</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">+{formatCurrency(fd.interestEarned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No active investments found during this financial year.</p>
          )}
        </div>
      </div>

      {/* Loans & Liabilities repayments */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-red-500 rounded-full"></span>
            Loans Repayments (EMIs & Penalty Paid)
          </h4>
          <div className="flex gap-2">
            <span className="text-xs font-bold text-slate-400">Total EMI Paid: {formatCurrency(metrics.totalEmiPaid)}</span>
            {metrics.totalPenaltyPaid > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                Penalty: {formatCurrency(metrics.totalPenaltyPaid)}
              </span>
            )}
          </div>
        </div>

        {loanDetails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                  <th className="pb-2">Lender & Ref ID</th>
                  <th className="pb-2 text-right">Sanctioned Principal</th>
                  <th className="pb-2 text-right">Interest Rate</th>
                  <th className="pb-2 text-right">YTD Total EMIs Paid</th>
                  <th className="pb-2 text-right">Of which Penalties / Charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loanDetails.map((loan: any, idx: number) => (
                  <tr key={idx} className="text-slate-700 font-medium">
                    <td className="py-2.5">
                      <p className="font-bold text-slate-800">{loan.bankName}</p>
                      <p className="text-[10px] text-slate-400">Ref: {loan.loanRef}</p>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(loan.principal)}</td>
                    <td className="py-2.5 text-right font-semibold">{loan.rate}%</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-800">{formatCurrency(loan.emiPaidAmount)}</td>
                    <td className="py-2.5 text-right font-bold text-red-600">
                      {loan.penaltyPaidAmount > 0 ? `-${formatCurrency(loan.penaltyPaidAmount)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">No active loans repayments recorded during this period.</p>
        )}
      </div>

      {/* Print Footer Details (Hidden in Screen view, Visible in Print view) */}
      <div className="hidden print:block border-t border-slate-200 pt-8 mt-12">
        <div className="grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700 uppercase">Declaration</p>
            <p className="mt-2 leading-relaxed">
              I hereby declare that this consolidated statement correctly reflects all transactions, incomes,
              asset investments, operational cost elements, and liabilities associated with the business for the designated audit period.
            </p>
          </div>
          <div className="text-right flex flex-col justify-between items-end h-24">
            <p className="font-bold text-slate-700 uppercase">Owner Signature / Seal</p>
            <div className="border-b border-slate-400 w-48 mt-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
