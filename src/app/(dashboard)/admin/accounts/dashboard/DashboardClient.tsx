"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  BookOpen,
  ArrowRightLeft,
  Building2,
  PieChart as PieIcon,
  Activity,
  Layers,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { PersonalAccountType, PersonalTxnType } from "@/generated/prisma";
import { cn } from "@/lib/utils";

// Theme Colors
const COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#ef4444"];

interface Account {
  id: string;
  name: string;
  accountType: PersonalAccountType;
  currentBalance: number;
  bankName: string | null;
}

interface Transaction {
  id: string;
  date: Date | string;
  type: PersonalTxnType;
  amount: number;
  description: string;
}

interface Udhaari {
  id: string;
  direction: string;
  totalAmount: number;
  status: string;
  recoveries: { amount: number }[];
}

interface SalaryDrawing {
  id: string;
  amount: number;
  type: string;
  employee: { name: string };
}

interface CompanyPayment {
  id: string;
  amount: number;
}

interface DashboardClientProps {
  accounts: Account[];
  transactions: Transaction[];
  udhaariList: Udhaari[];
  salaryDrawings: SalaryDrawing[];
  companyPayments: CompanyPayment[];
}

export function DashboardClient({
  accounts,
  transactions,
  udhaariList,
  salaryDrawings,
  companyPayments,
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute Net Worth
  const totalAssets = accounts
    .filter((a) => a.accountType !== "LOAN")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.accountType === "LOAN")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const netWorth = totalAssets - totalLiabilities;

  // Monthly Cash Flow (Current Calendar Month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyInflow = thisMonthTxns
    .filter((t) => ["INCOME", "TRANSFER_IN", "UDHAARI_RECEIVED"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyOutflow = thisMonthTxns
    .filter((t) => ["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  // Udhaari Net Position
  const udhaariGivenOut = udhaariList
    .filter((u) => u.direction === "GIVEN")
    .reduce((sum, u) => {
      const recovered = u.recoveries.reduce((s, r) => s + r.amount, 0);
      return sum + (u.status === "WRITTEN_OFF" ? 0 : u.totalAmount - recovered);
    }, 0);

  const udhaariTakenOut = udhaariList
    .filter((u) => u.direction === "TAKEN")
    .reduce((sum, u) => {
      const recovered = u.recoveries.reduce((s, r) => s + r.amount, 0);
      return sum + (u.status === "WRITTEN_OFF" ? 0 : u.totalAmount - recovered);
    }, 0);

  const netUdhaari = udhaariGivenOut - udhaariTakenOut;

  // YTD Metrics
  const totalSalariesYTD = salaryDrawings.reduce((sum, d) => sum + d.amount, 0);
  const totalCompanyPaymentsYTD = companyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Chart 1: Asset Allocation data
  const assetAllocationData = accounts.map((a) => ({
    name: a.name,
    value: Math.max(0, a.currentBalance),
  })).filter((d) => d.value > 0);

  // Chart 2: Last 6 Months Inflows vs Outflows
  const getLast6MonthsData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const monthName = targetDate.toLocaleString("default", { month: "short" });

      const filtered = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });

      const inflow = filtered
        .filter((t) => ["INCOME", "TRANSFER_IN", "UDHAARI_RECEIVED"].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = filtered
        .filter((t) => ["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        month: monthName,
        Inflow: inflow,
        Outflow: outflow,
      });
    }
    return data;
  };

  const monthlyTrendData = getLast6MonthsData();

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* ── Net Worth Gradient Banner ── */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 text-white/5 pointer-events-none">
          <Sparkles className="w-80 h-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider border border-indigo-400/20">
              Personal Wealth Command Center
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-2">
              {formatCurrency(netWorth)}
            </h2>
            <p className="text-xs text-slate-300 max-w-md">
              Total consolidated net worth across all asset holdings, cash drawers, and liabilities.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Assets</span>
              <span className="text-lg font-black text-emerald-400">+{formatCurrency(totalAssets)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Liabilities</span>
              <span className="text-lg font-black text-rose-400">-{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Indicators Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Cash Flow */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">This Month Margin</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className={cn("text-xl font-black", (monthlyInflow - monthlyOutflow) >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatCurrency(monthlyInflow - monthlyOutflow)}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              +{formatCurrency(monthlyInflow)} In / -{formatCurrency(monthlyOutflow)} Out
            </p>
          </div>
        </div>

        {/* Udhaari Net */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Udhaari Net Position</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className={cn("text-xl font-black", netUdhaari >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatCurrency(netUdhaari)}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Given: {formatCurrency(udhaariGivenOut)} | Taken: {formatCurrency(udhaariTakenOut)}
            </p>
          </div>
        </div>

        {/* Salaries burn */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salary Drawings YTD</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800">
              {formatCurrency(totalSalariesYTD)}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Total payroll payouts tracked
            </p>
          </div>
        </div>

        {/* Oil Company Payouts */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Payouts YTD</span>
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800">
              {formatCurrency(totalCompanyPaymentsYTD)}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Payments made to Oil Companies
            </p>
          </div>
        </div>
      </div>

      {/* ── Recharts Chart Layouts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Cash Inflow vs Outflow Trend</h4>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-full">Last 6 Months</span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} style={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation Pie Chart */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Asset Allocation</h4>
            <PieIcon className="w-4 h-4 text-indigo-600" />
          </div>

          {assetAllocationData.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-slate-400 text-xs">
              No balances configured to show.
            </div>
          ) : (
            <div className="h-72 flex flex-col justify-between">
              <div className="h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {assetAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Labels Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center text-[10px] text-slate-500 font-semibold px-2">
                {assetAllocationData.map((d, index) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-navigation Cards ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Quick Navigation Ledger Hubs</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/accounts"
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 block">Personal Accounts</span>
              <span className="text-[10px] text-slate-400 font-medium">CRUD & Wallets</span>
            </div>
          </Link>

          <Link
            href="/admin/accounts/agency-account"
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 block">Agency Account</span>
              <span className="text-[10px] text-slate-400 font-medium">Auto-Sync Logs</span>
            </div>
          </Link>

          <Link
            href="/admin/accounts/udhaari"
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 block">Udhaari Ledger</span>
              <span className="text-[10px] text-slate-400 font-medium">Outstanding Balances</span>
            </div>
          </Link>

          <Link
            href="/admin/accounts/transfer"
            className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 block">Fund Transfer</span>
              <span className="text-[10px] text-slate-400 font-medium">Double-Entry Booking</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Recent Consolidated Activity ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Recent Personal Transactions Log</h4>
          <Link
            href="/admin/accounts"
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition"
          >
            View All Ledger Statements <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No transactions found.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((t) => {
              const isDebit = ["EXPENSE", "TRANSFER_OUT", "UDHAARI_GIVEN"].includes(t.type);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 border border-slate-50 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs",
                        isDebit ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {isDebit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{t.description}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <span className={cn("text-xs font-black", isDebit ? "text-rose-600" : "text-emerald-600")}>
                    {isDebit ? "-" : "+"}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
