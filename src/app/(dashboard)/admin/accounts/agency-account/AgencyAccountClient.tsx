"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Printer,
  PiggyBank,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { PersonalAccountType, PersonalTxnType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { generateVoucherPDF } from "@/lib/voucher-pdf";

interface Transaction {
  id: string;
  date: Date | string;
  type: PersonalTxnType;
  amount: number;
  description: string;
  paymentMode: string | null;
  referenceNo: string | null;
  linkedModule: string | null;
  linkedRecordId: string | null;
  notes: string | null;
}

interface Account {
  id: string;
  name: string;
  accountType: PersonalAccountType;
  currentBalance: number;
  bankName: string | null;
  accountNo: string | null;
}

interface AgencyAccountClientProps {
  agencyAccount: Account | null;
  initialTransactions: Transaction[];
  ownerDrawings: any[];
}

export function AgencyAccountClient({ agencyAccount, initialTransactions, ownerDrawings }: AgencyAccountClientProps) {
  // Filters State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | PersonalTxnType>("ALL");
  const [syncFilter, setSyncFilter] = useState<"ALL" | "SYNCED" | "MANUAL">("ALL");
  const [activeTab, setActiveTab] = useState<"statement" | "drawings">("statement");

  function handlePrintVoucher(t: Transaction) {
    const isCredit = !["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type);
    generateVoucherPDF({
      voucherNo: t.id.substring(t.id.length - 8).toUpperCase(),
      date: formatDate(t.date),
      type: isCredit ? "INFLOW" : "OUTFLOW",
      amount: t.amount,
      description: t.description,
      partyName: isCredit ? "Received" : "Paid Out",
      paymentMode: t.paymentMode || "UPI",
      referenceNo: t.referenceNo || "N/A",
      accountName: agencyAccount?.name || "Agency Account",
      agencyName: "Gas Agency Finance Division"
    });
  }

  if (!agencyAccount) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm max-w-2xl mx-auto mt-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Agency Account Configured</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
          To track automated agency cash flows (salary payments, oil company transactions, and business expenses), you must flag one of your bank/personal accounts as the primary **Agency Account**.
        </p>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-sm"
        >
          Go to Accounts Hub to Configure <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Calculate statistics (Current month or all time depending on selection, here all-time on this account)
  const totalInflows = initialTransactions
    .filter((t) => ["INCOME", "TRANSFER_IN", "UDHAARI_RECEIVED"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = initialTransactions
    .filter((t) => ["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  // Sync categories breakdown
  const salarySynced = initialTransactions
    .filter((t) => t.linkedModule === "SALARY")
    .reduce((sum, t) => sum + t.amount, 0);

  const companyPaymentSynced = initialTransactions
    .filter((t) => t.linkedModule === "COMPANY_PAYMENT")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseSynced = initialTransactions
    .filter((t) => t.linkedModule === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const manualTxns = initialTransactions
    .filter((t) => !t.linkedModule)
    .reduce((sum, t) => sum + t.amount, 0);

  // Filtered transactions list
  const filteredTransactions = initialTransactions.filter((t) => {
    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(term);
      const refMatch = t.referenceNo?.toLowerCase().includes(term);
      const noteMatch = t.notes?.toLowerCase().includes(term);
      if (!descMatch && !refMatch && !noteMatch) return false;
    }

    // Type Filter
    if (typeFilter !== "ALL" && t.type !== typeFilter) return false;

    // Sync Filter
    if (syncFilter === "SYNCED" && !t.linkedModule) return false;
    if (syncFilter === "MANUAL" && t.linkedModule) return false;

    return true;
  });

  return (
    <div className="space-y-6 mt-4">
      {/* ── Top Agency Card & Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 text-white/5 pointer-events-none">
            <Building2 className="w-64 h-64" />
          </div>

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider border border-indigo-400/20">
                Primary Operational Account
              </span>
              <h3 className="text-xl font-bold mt-2.5">{agencyAccount.name}</h3>
              <p className="text-xs text-slate-300 mt-1">
                {agencyAccount.bankName || "Internal Ledger"} • {agencyAccount.accountNo ? `**** ${agencyAccount.accountNo.slice(-4)}` : "Cash Wallet"}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Auto-Sync
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-xs font-semibold block">Available Book Balance</span>
            <span className="text-3xl font-black">{formatCurrency(agencyAccount.currentBalance)}</span>
          </div>
        </div>

        {/* Sync Summary Widget */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Sync Integrations</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-amber-50/50 border border-amber-100/50 rounded-xl">
              <span className="font-bold text-amber-800">Salary Synced</span>
              <span className="font-black text-slate-800">{formatCurrency(salarySynced)}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-blue-50/50 border border-blue-100/50 rounded-xl">
              <span className="font-bold text-blue-800">Company Payments</span>
              <span className="font-black text-slate-800">{formatCurrency(companyPaymentSynced)}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-rose-50/50 border border-rose-100/50 rounded-xl">
              <span className="font-bold text-rose-800">Expenses Synced</span>
              <span className="font-black text-slate-800">{formatCurrency(expenseSynced)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cash Flow P&L Snapshot Report ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Agency Cash Flow & Profitability Snapshot</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* mini P&L Ledger layout */}
          <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-2">
              <span className="text-slate-400 uppercase tracking-wider">P&L Item (Revenue vs Cost)</span>
              <span className="text-slate-400 uppercase tracking-wider text-right">Amount (₹)</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational Credits / Collections
              </span>
              <span className="font-bold text-slate-800">+{formatCurrency(totalInflows)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Less: Salaries & Draw Payouts
              </span>
              <span className="font-bold text-slate-800">-{formatCurrency(salarySynced)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Less: Oil Company Payments
              </span>
              <span className="font-bold text-slate-800">-{formatCurrency(companyPaymentSynced)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Less: Operating Expenses (Synced)
              </span>
              <span className="font-bold text-slate-800">-{formatCurrency(expenseSynced)}</span>
            </div>

            <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Less: General Outflows (Manual/Other)
              </span>
              <span className="font-bold text-slate-800">-{formatCurrency(Math.max(0, totalOutflows - salarySynced - companyPaymentSynced - expenseSynced))}</span>
            </div>

            <div className="flex justify-between text-sm font-black pt-1">
              <span className="text-slate-800">Net Operational Margin (Recomputed)</span>
              <span className={cn(totalInflows - totalOutflows >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatCurrency(totalInflows - totalOutflows)}
              </span>
            </div>
          </div>

          {/* Graphical summary breakdown details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Total Inflow</span>
                <h4 className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(totalInflows)}</h4>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Customer Collections / Transfers
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Total Outflow</span>
                <h4 className="text-xl font-black text-rose-700 mt-1">{formatCurrency(totalOutflows)}</h4>
                <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Salaries, Invoices & Expenses
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl text-xs text-indigo-900 border border-indigo-100/30">
              <span className="font-bold block mb-1">Operational Auto-Sync Notice</span>
              All expenses, staff salary slips, and oil company invoice payments added elsewhere in the system will automatically reconcile and adjust the book balance of this account in real-time.
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2 border-b border-slate-200 mb-4 mt-2">
        <button
          onClick={() => setActiveTab("statement")}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl border-b-2 transition ${
            activeTab === "statement"
              ? "border-indigo-500 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Statement & Sync Ledger
        </button>
        <button
          onClick={() => setActiveTab("drawings")}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "drawings"
              ? "border-indigo-500 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <PiggyBank className="w-3.5 h-3.5" /> Owner Drawings
          {ownerDrawings.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
              {ownerDrawings.length}
            </span>
          )}
        </button>
      </div>

      {/* ── STATEMENT TAB ── */}
      {activeTab === "statement" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Account Statements & Sync Ledger</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              Showing {filteredTransactions.length} operations logs
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search synced logs, invoice ref..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="INCOME">Income Only</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="TRANSFER_IN">Internal Transfers In</option>
              <option value="TRANSFER_OUT">Internal Transfers Out</option>
            </select>

            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Entries</option>
              <option value="SYNCED">Sync-automated Entries Only</option>
              <option value="MANUAL">Manual Bookkeeping Entries Only</option>
            </select>
          </div>

          {/* ── Statements table list ── */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10 border-t border-slate-50">
              <p className="text-slate-400 text-sm">No transaction matches filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Description</th>
                    <th className="py-3 px-2">Source Type</th>
                    <th className="py-3 px-2">Ref / UTR</th>
                    <th className="py-3 px-2 text-right">Amount</th>
                    <th className="py-3 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map((t) => {
                    const isDebit = ["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-2 text-slate-500 whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-3.5 px-2 font-medium text-slate-800">
                          <div className="flex flex-col">
                            <span>{t.description}</span>
                            {t.notes && <span className="text-[10px] text-slate-400 italic font-normal mt-0.5">{t.notes}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          {t.linkedModule ? (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider",
                                t.linkedModule === "SALARY" && "bg-amber-100 text-amber-800",
                                t.linkedModule === "COMPANY_PAYMENT" && "bg-blue-100 text-blue-800",
                                t.linkedModule === "EXPENSE" && "bg-rose-100 text-rose-800"
                              )}
                            >
                              Sync: {t.linkedModule}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Manual Entry
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-slate-500 font-mono">
                          {t.referenceNo || "—"}
                        </td>
                        <td
                          className={cn(
                            "py-3.5 px-2 text-right font-bold text-sm",
                            isDebit ? "text-rose-600" : "text-emerald-600"
                          )}
                        >
                          {isDebit ? "-" : "+"}{formatCurrency(t.amount)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => handlePrintVoucher(t)}
                            title="Print Voucher"
                            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── OWNER DRAWINGS TAB ── */}
      {activeTab === "drawings" && (() => {
        const ytdStart = new Date();
        ytdStart.setMonth(3); // April
        ytdStart.setDate(1);
        if (new Date().getMonth() < 3) ytdStart.setFullYear(ytdStart.getFullYear() - 1);
        ytdStart.setHours(0, 0, 0, 0);

        const ytdDrawings = ownerDrawings.filter(d => new Date(d.date) >= ytdStart);
        const ytdTotal = ytdDrawings.reduce((s: number, d: any) => s + d.amount, 0);
        const allTotal = ownerDrawings.reduce((s: number, d: any) => s + d.amount, 0);

        // Group by month
        const byMonth: Record<string, { month: string; total: number; entries: any[] }> = {};
        ownerDrawings.forEach((d) => {
          const key = new Date(d.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
          if (!byMonth[key]) byMonth[key] = { month: key, total: 0, entries: [] };
          byMonth[key].total += d.amount;
          byMonth[key].entries.push(d);
        });

        return (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">FY YTD Drawings</p>
                <h3 className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(ytdTotal)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Apr {ytdStart.getFullYear()} – Present</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Drawings (All Time)</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(allTotal)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Across all accounts</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Drawing Transactions</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{ownerDrawings.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">AGENCY_WITHDRAWAL + personal draws</p>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Monthly Drawings Breakdown
              </h4>
              {Object.values(byMonth).length === 0 ? (
                <div className="text-center py-10">
                  <PiggyBank className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No owner drawings recorded yet.</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Add transactions with type <span className="font-bold">AGENCY_WITHDRAWAL</span> or tag them with{" "}
                    <span className="font-bold">drawings</span> from the Mobile Quick Entry.
                  </p>
                </div>
              ) : (
                Object.values(byMonth).map((group) => (
                  <div key={group.month} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-slate-50">
                      <span className="text-xs font-extrabold text-slate-700">{group.month}</span>
                      <span className="text-xs font-black text-rose-600">-{formatCurrency(group.total)}</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-slate-50">
                        {group.entries.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50/40">
                            <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap w-28">{formatDate(d.date)}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-medium">{d.description}</td>
                            <td className="py-2.5 px-4 text-slate-500">
                              {d.account?.name && (
                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">
                                  {d.account.name}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-rose-600">{formatCurrency(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

