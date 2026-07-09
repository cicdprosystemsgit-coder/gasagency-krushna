"use client";

import { useState, useTransition, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Wallet,
  Car,
  Package,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  PieChart,
  RefreshCw,
  Banknote,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { getFinancialSummary, getExpenseBreakdown, updateAsset, generateAssetsReport } from "@/app/actions/assets";
import { createCompanyPayment, getCompanyPayments } from "@/app/actions/company-payments";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface FinancialSummaryData {
  domesticRevenue: number;
  commercialRevenue: number;
  officeRevenue: number;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  operationalExpenses: number;
  payrollExpenses: number;
  totalOpEx: number;
  netProfit: number;
  totalReceivables: number;
  cashOnHand: number;
  physicalAssetsValue: number;
  stockValuation: number;
}

interface AssetsManagementClientProps {
  initialSummary: FinancialSummaryData;
  initialTrend: Array<{
    month: string;
    label: string;
    domestic: number;
    commercial: number;
    office: number;
    cogs: number;
    revenue: number;
    netProfit: number;
  }>;
  initialExpenses: Array<{ name: string; value: number }>;
  initialAssets: Array<{
    id: string;
    assetType: "VEHICLE" | "AGENCY";
    name: string;
    registrationDate: string | Date;
    lastRenewalDate: string | Date | null;
    nextRenewalDate: string | Date | null;
    price: number;
    comment: string | null;
    isActive: boolean;
    daysLeft: number | null;
    renewalStatus: "normal" | "warning" | "critical";
  }>;
  initialInventory: Array<{
    id: string;
    name: string;
    closingStock: number;
    unitCost: number;
    saleRate: number;
    stockValue: number;
    potentialRevenue: number;
  }>;
  initialTotalInventoryValue: number;
  initialPayroll: {
    totalSalaryObligation: number;
    paidThisMonth: number;
    outstandingAdvances: number;
  };
  initialDebtors: Array<{
    id: string;
    name: string;
    phone: string;
    type: string;
    balance: number;
  }>;
  recentPayments: Array<{
    id: string;
    date: string | Date;
    amount: number;
    paymentMode: string;
    referenceNo: string | null;
    invoiceNo: string | null;
    qtyCylinders: number | null;
    oilCompany: string | null;
    description: string | null;
    product: { name: string } | null;
    addedBy: { name: string };
  }>;
  products: { id: string; name: string }[];
  canEdit: boolean;
  defaultFrom: string;
  defaultTo: string;
}

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#EC4899", "#0891B2", "#EA580C", "#14B8A6"];

export function AssetsManagementClient({
  initialSummary,
  initialTrend,
  initialExpenses,
  initialAssets,
  initialInventory,
  initialTotalInventoryValue,
  initialPayroll,
  initialDebtors,
  recentPayments,
  products,
  canEdit,
  defaultFrom,
  defaultTo,
}: AssetsManagementClientProps) {
  const [summary, setSummary] = useState<FinancialSummaryData>(initialSummary);
  const [trend, setTrend] = useState(initialTrend);
  const [expensesBreakdown, setExpensesBreakdown] = useState(initialExpenses);
  const [assets, setAssets] = useState(initialAssets);
  const [inventory, setInventory] = useState(initialInventory);
  const [totalInventoryValue, setTotalInventoryValue] = useState(initialTotalInventoryValue);
  const [payroll, setPayroll] = useState(initialPayroll);
  const [debtors, setDebtors] = useState(initialDebtors);
  const [payments, setPayments] = useState(recentPayments);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tabs state
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "expenses" | "physical" | "stock">("overview");

  // Date Range state
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  // Synchronize state with URL search params on mount or change
  useEffect(() => {
    const urlFrom = searchParams.get("from");
    const urlTo = searchParams.get("to");
    if (urlFrom) setFrom(urlFrom);
    if (urlTo) setTo(urlTo);
  }, [searchParams]);

  // Company Payment Modal State
  const [quickPayModal, setQuickPayModal] = useState(false);
  const [error, setError] = useState("");
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "NEFT",
    referenceNo: "",
    invoiceNo: "",
    productId: "NONE",
    qtyCylinders: "",
    oilCompany: "HP Gas",
    description: "",
  });

  // Edit Physical Asset Modal State
  const [editAssetModal, setEditAssetModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState<any>(null);
  const [assetForm, setAssetForm] = useState({
    nextRenewalDate: "",
    price: "",
    comment: "",
  });

  async function handleDateFilter(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const summaryRes = await getFinancialSummary(from, to);
      const expenseRes = await getExpenseBreakdown(from, to);
      if (summaryRes.summary) {
        setSummary(summaryRes.summary);
      }
      if (expenseRes.data) {
        setExpensesBreakdown(expenseRes.data);
      }
      // Update URL search parameters
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", from);
      params.set("to", to);
      router.push(`${pathname}?${params.toString()}`);
      toast.success("Financial filters applied successfully");
    });
  }

  async function handleExportPDF() {
    startExportTransition(async () => {
      try {
        const result = await generateAssetsReport(from, to);
        if ("error" in result) {
          toast.error(result.error || "Export failed");
          return;
        }
        // Trigger browser download of PDF
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${result.base64}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Report downloaded successfully");
      } catch (err) {
        console.error("Export error:", err);
        toast.error("Failed to generate report");
      }
    });
  }

  async function handleQuickPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payForm.date) { setError("Date is required"); return; }
    if (!payForm.amount || Number(payForm.amount) <= 0) { setError("Valid amount is required"); return; }

    const fd = new FormData();
    Object.entries(payForm).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await createCompanyPayment(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Company payment recorded");
      setQuickPayModal(false);
      
      // Refresh current summary and payments lists
      const [summaryRes, paymentsRes] = await Promise.all([
        getFinancialSummary(from, to),
        getCompanyPayments(),
      ]);
      if (summaryRes.summary) setSummary(summaryRes.summary);
      if (paymentsRes.payments) setPayments(paymentsRes.payments.slice(0, 5) as any);
    });
  }

  async function handleAssetUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAsset) return;

    startTransition(async () => {
      const result = await updateAsset(activeAsset.id, {
        nextRenewalDate: assetForm.nextRenewalDate ? new Date(assetForm.nextRenewalDate) : null,
        price: Number(assetForm.price) || 0,
        comment: assetForm.comment || null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Asset details updated");
      setEditAssetModal(false);
      
      // Update local state
      setAssets((prev) =>
        prev.map((a) =>
          a.id === activeAsset.id
            ? {
                ...a,
                nextRenewalDate: assetForm.nextRenewalDate ? new Date(assetForm.nextRenewalDate) : null,
                price: Number(assetForm.price) || 0,
                comment: assetForm.comment || null,
              }
            : a
        )
      );
    });
  }

  function openEditAssetModal(asset: any) {
    setActiveAsset(asset);
    setAssetForm({
      nextRenewalDate: asset.nextRenewalDate ? new Date(asset.nextRenewalDate).toISOString().split("T")[0] : "",
      price: asset.price.toString(),
      comment: asset.comment || "",
    });
    setEditAssetModal(true);
  }

  return (
    <div className="space-y-6">
      {/* Date controls and presets */}
      <div className="card p-4">
        <form onSubmit={handleDateFilter} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input py-2 px-3 text-xs w-36"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input py-2 px-3 text-xs w-36"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary py-2 px-4 text-xs self-end h-[38px] flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              Apply Range
            </button>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPDF}
              className="btn bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl font-semibold transition disabled:opacity-60"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export PDF
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setPayForm({
                    date: new Date().toISOString().split("T")[0],
                    amount: "",
                    paymentMode: "NEFT",
                    referenceNo: "",
                    invoiceNo: "",
                    productId: "NONE",
                    qtyCylinders: "",
                    oilCompany: "HP Gas",
                    description: "",
                  });
                  setQuickPayModal(true);
                }}
                className="btn bg-red-700 hover:bg-red-800 text-white py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl font-semibold transition"
              >
                <Plus className="w-4 h-4" /> Record Company Payment
              </button>
            )}
          </div>
        </form>
      </div>

      {isPending ? (
        <div className="space-y-6">
          {/* Skeleton KPI summaries row — 8 cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="card p-4 animate-pulse space-y-3">
                <div className="h-2.5 w-16 bg-slate-200 rounded"></div>
                <div className="h-6 w-24 bg-slate-200 rounded"></div>
                <div className="h-2 w-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>

          {/* Skeleton Tabs list */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl animate-pulse">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex-1 py-4 bg-white rounded-lg opacity-60"></div>
            ))}
          </div>

          {/* Skeleton Tab content */}
          <div className="card p-6 animate-pulse space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                <div className="h-3 w-4/5 bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
              </div>
              <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI summaries row — 8 cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-green-600 text-[10px] font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Sales Inflow</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Company Paid (COGS)</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalCOGS)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-slate-500 text-[10px] font-medium">
            <Package className="w-3 h-3" />
            <span>Stock purchase</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Gross Profit</p>
          <p className={`text-lg font-bold ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(summary.grossProfit)}</p>
          <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {summary.grossProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>Rev - COGS</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Operating Expenses</p>
          <p className="text-lg font-bold text-slate-700">{formatCurrency(summary.totalOpEx)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-slate-500 text-[10px] font-medium">
            <Wallet className="w-3 h-3" />
            <span>OpEx + Payroll</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Net Profit</p>
          <p className={`text-lg font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(summary.netProfit)}
          </p>
          <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {summary.netProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>Net Earnings</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Receivables (Udhari)</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.totalReceivables)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-amber-600 text-[10px] font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span>Pending collection</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Physical Assets</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.physicalAssetsValue)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-slate-500 text-[10px] font-medium">
            <Car className="w-3 h-3" />
            <span>Active assets value</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Cash on Hand</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.cashOnHand)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-blue-500 text-[10px] font-medium">
            <Banknote className="w-3 h-3" />
            <span>Last daily closing</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {[
          { id: "overview", label: "P&L Overview", icon: <FileText className="w-3.5 h-3.5" /> },
          { id: "payments", label: "Company Payments", icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: "expenses", label: "Expenses & OpEx", icon: <Wallet className="w-3.5 h-3.5" /> },
          { id: "physical", label: "Physical Assets", icon: <Car className="w-3.5 h-3.5" /> },
          { id: "stock", label: "Stock & Payroll", icon: <Package className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* P&L Statement Card */}
          <div className="card lg:col-span-1 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="text-sm font-bold text-slate-900">Income Statement</h4>
                <span className="text-[10px] text-slate-400 font-semibold">SELECTED PERIOD</span>
              </div>
              <div className="space-y-4">
                {/* Revenue section */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    <span>Revenue</span>
                    <span>{formatCurrency(summary.totalRevenue)}</span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Domestic Sales</span>
                      <span>{formatCurrency(summary.domesticRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Commercial Sales</span>
                      <span>{formatCurrency(summary.commercialRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Office Transactions</span>
                      <span>{formatCurrency(summary.officeRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* COGS section */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    <span>Cost of Goods (COGS)</span>
                    <span className="text-red-600">({formatCurrency(summary.totalCOGS)})</span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Oil Co. Stock Purchases</span>
                      <span>{formatCurrency(summary.totalCOGS)}</span>
                    </div>
                  </div>
                </div>

                {/* Gross Margin */}
                <div className="flex justify-between py-2 border-y border-slate-100 font-bold text-slate-900 text-xs uppercase bg-slate-50 px-2 rounded-lg">
                  <span>Gross Profit</span>
                  <span className="text-green-600">
                    {formatCurrency(summary.grossProfit)}
                  </span>
                </div>

                {/* OpEx section */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    <span>Operating Expenses</span>
                    <span className="text-red-600">({formatCurrency(summary.totalOpEx)})</span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>General & Categories</span>
                      <span>{formatCurrency(summary.operationalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Payroll Salaries</span>
                      <span>{formatCurrency(summary.payrollExpenses)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center bg-blue-50/50 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Profit / Loss</span>
                <span className={`text-lg font-extrabold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(summary.netProfit)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Margin</span>
                <span className={`text-xs font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Revenue vs COGS Trend Line Chart */}
          <div className="card lg:col-span-2 p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Revenue vs Cost of Goods (COGS) Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} name="Total Revenue" />
                  <Line type="monotone" dataKey="cogs" stroke="#EF4444" strokeWidth={2} name="Company Payments (COGS)" />
                  <Line type="monotone" dataKey="netProfit" stroke="#16A34A" strokeWidth={2} name="Gross Margin" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "payments" && (() => {
        const now = new Date();
        const msThisMonth = payments.filter((p) => new Date(p.date) >= new Date(now.getFullYear(), now.getMonth(), 1));
        const msLastMonth = payments.filter((p) => {
          const d = new Date(p.date);
          return d >= new Date(now.getFullYear(), now.getMonth() - 1, 1) && d < new Date(now.getFullYear(), now.getMonth(), 1);
        });
        const thisMonthTotal = msThisMonth.reduce((s, p) => s + p.amount, 0);
        const lastMonthTotal = msLastMonth.reduce((s, p) => s + p.amount, 0);
        const ytdTotal = payments.filter((p) => new Date(p.date).getFullYear() === now.getFullYear()).reduce((s, p) => s + p.amount, 0);
        const avgMonthly = trend.length > 0 ? trend.reduce((s, t) => s + t.cogs, 0) / trend.length : 0;
        return (
          <div className="space-y-6">
            {/* COGS Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">This Month</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(thisMonthTotal)}</p>
                <p className="text-[10px] text-slate-400 mt-1">Paid to oil company</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Last Month</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(lastMonthTotal)}</p>
                <p className="text-[10px] text-slate-400 mt-1">Prior period</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">YTD Total</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(ytdTotal)}</p>
                <p className="text-[10px] text-slate-400 mt-1">This financial year</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Avg / Month</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(avgMonthly)}</p>
                <p className="text-[10px] text-slate-400 mt-1">6-month average</p>
              </div>
            </div>

            {/* Trend Chart + Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-5 lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Monthly Payment Trend (6 months)</h4>
                  <Link href="/admin/company-payments" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                    Full Ledger <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} />
                      <Bar dataKey="cogs" fill="#EF4444" name="Paid to Oil Co." radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card p-5 lg:col-span-1 space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Why Record These?</h4>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                    <p className="text-[11px] leading-normal font-medium">These NEFT/RTGS transfers are your single largest cost. Without them, P&L shows inflated profit.</p>
                  </div>
                  <p>Every receipt from the bank must be logged here with UTR number for accurate COGS calculation.</p>
                  <Link href="/admin/company-payments" className="btn btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5">
                    Open Full Ledger <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Full payments table */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Company Payment Ledger</h4>
                  <p className="text-[11px] text-slate-400">All recorded bank transfers to oil company (up to 50 recent)</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { setError(""); setPayForm({ date: new Date().toISOString().split("T")[0], amount: "", paymentMode: "NEFT", referenceNo: "", invoiceNo: "", productId: "NONE", qtyCylinders: "", oilCompany: "HP Gas", description: "" }); setQuickPayModal(true); }}
                    className="btn bg-red-700 hover:bg-red-800 text-white py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Quick Add
                  </button>
                )}
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="table w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100 text-slate-400 text-left">
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Oil Company</th>
                      <th className="pb-2 font-semibold">Invoice No.</th>
                      <th className="pb-2 font-semibold">UTR / Ref</th>
                      <th className="pb-2 font-semibold">Product</th>
                      <th className="pb-2 font-semibold text-right">Qty</th>
                      <th className="pb-2 font-semibold text-right">Amount</th>
                      <th className="pb-2 font-semibold text-center">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={8} className="py-10 text-center text-slate-400">No payments recorded. Click "Quick Add" to record the first transfer.</td></tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium">{formatDate(p.date)}</td>
                          <td className="py-2.5 font-bold text-slate-800">{p.oilCompany || "—"}</td>
                          <td className="py-2.5 font-mono text-slate-500">{p.invoiceNo || "—"}</td>
                          <td className="py-2.5 font-mono text-slate-500">{p.referenceNo || "—"}</td>
                          <td className="py-2.5">{p.product?.name || <span className="text-slate-400 italic">Mixed</span>}</td>
                          <td className="py-2.5 text-right">{p.qtyCylinders ?? "—"}</td>
                          <td className="py-2.5 text-right font-bold text-red-600">{formatCurrency(p.amount)}</td>
                          <td className="py-2.5 text-center">
                            <span className="badge text-[10px] px-1.5 rounded border border-slate-100 bg-slate-50 text-slate-700">{p.paymentMode}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expenses Donut Chart */}
          <div className="card p-5 lg:col-span-1 flex flex-col justify-between">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Category Breakdown</h4>
            {expensesBreakdown.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400">No expenses recorded for selected range</div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expensesBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {expensesBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {expensesBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Budget Info or Actions */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 font-semibold">Running Expenses Controls</h4>
              <Link href="/admin/expenses" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                Manage Expenses <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3.5 text-xs text-slate-600">
              <p>
                Operational expenses are secondary outflows such as delivery vehicle repairs, vehicle fuel, office electricity, telephone, stationeries, and tea/hospitality costs.
              </p>
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Category-wise Budgets</h5>
                    <p className="text-[11px] text-slate-400">Manage monthly expense thresholds per division</p>
                  </div>
                  <Link href="/admin/expense-categories" className="btn btn-secondary py-1.5 px-3 text-[11px]">
                    Configure Categories
                  </Link>
                </div>
                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Vehicle trip fuel tracking</h5>
                    <p className="text-[11px] text-slate-400">Review logbooks of internal delivery trucks</p>
                  </div>
                  <Link href="/admin/expenses" className="btn btn-secondary py-1.5 px-3 text-[11px]">
                    Track Vehicle Asset Costs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "physical" && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Physical Asset Registry & Renewal Alarms</h4>
            <span className="badge badge-neutral text-xs">{assets.length} Assets Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Asset Type</th>
                  <th>Name / Reg. No.</th>
                  <th>Registration Date</th>
                  <th>Last Renewal</th>
                  <th>Next Renewal Date</th>
                  <th>Days Left</th>
                  <th className="text-right">Valuation (₹)</th>
                  <th>Comment</th>
                  {canEdit && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 text-xs">
                      No registered physical assets
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <td className="font-semibold text-xs">
                        <span className={`badge ${a.assetType === "VEHICLE" ? "badge-info" : "badge-neutral"} text-[10px] px-2 py-0.5 rounded-md`}>
                          {a.assetType}
                        </span>
                      </td>
                      <td className="font-bold text-slate-800">{a.name}</td>
                      <td>{formatDate(a.registrationDate)}</td>
                      <td>{a.lastRenewalDate ? formatDate(a.lastRenewalDate) : "—"}</td>
                      <td className="font-semibold text-slate-800">
                        {a.nextRenewalDate ? formatDate(a.nextRenewalDate) : "—"}
                      </td>
                      <td>
                        {a.nextRenewalDate ? (
                          <span
                            className={`badge text-[10px] px-2 py-0.5 rounded font-bold ${
                              a.renewalStatus === "critical"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : a.renewalStatus === "warning"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {a.daysLeft !== null && a.daysLeft < 0 ? `Expired (${Math.abs(a.daysLeft)}d ago)` : `${a.daysLeft} days`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-right font-bold">{formatCurrency(a.price)}</td>
                      <td className="text-xs text-slate-500 max-w-xs truncate">{a.comment || "—"}</td>
                      {canEdit && (
                        <td className="text-right">
                          <button
                            onClick={() => openEditAssetModal(a)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="Edit Asset / Next Renewal"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Valuation List */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Inventory Stock Valuation</h4>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">TOTAL VALUE</span>
                <span className="text-base font-extrabold text-blue-600">{formatCurrency(totalInventoryValue)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Closing Stock</th>
                    <th className="text-right">Unit Purchase Cost</th>
                    <th className="text-right">Total Valuation</th>
                    <th className="text-right">Retail Sale Rate</th>
                    <th className="text-right">Potential Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400 text-xs">
                        No product stocks recorded
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs">
                        <td className="font-bold text-slate-800">{item.name}</td>
                        <td className="text-right font-medium">{item.closingStock} units</td>
                        <td className="text-right">{formatCurrency(item.unitCost)}</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(item.stockValue)}</td>
                        <td className="text-right text-slate-600">{formatCurrency(item.saleRate)}</td>
                        <td className="text-right font-bold text-green-600">{formatCurrency(item.potentialRevenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-1">
            {/* Payroll Summary Card */}
            <div className="card p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Payroll Liabilities</span>
                <Link href="/admin/salaries" className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold">
                  Manage Payroll
                </Link>
              </h4>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Monthly Obligation</span>
                  <span className="font-bold text-slate-850">{formatCurrency(payroll.totalSalaryObligation)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Disbursed This Month</span>
                  <span className="font-bold text-green-600">{formatCurrency(payroll.paidThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Outstanding advances</span>
                  <span className="font-bold text-amber-600">{formatCurrency(payroll.outstandingAdvances)}</span>
                </div>
              </div>
            </div>

            {/* Top Debtors Credit Ledger Card */}
            <div className="card p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Top Outstanding Debts (Udhari)
              </h4>
              {debtors.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No outstanding debtors credit balance</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {debtors.map((d, idx) => (
                    <div key={d.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <span className="font-bold text-slate-800">{d.name}</span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase ml-2 px-1 py-0.2 bg-slate-100 rounded">
                          {d.type}
                        </span>
                      </div>
                      <span className="font-bold text-red-600">{formatCurrency(d.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Record Company Payment Modal */}
      <Modal open={quickPayModal} onClose={() => setQuickPayModal(false)} title="Record Oil Company Stock Payment" size="lg">
        <form onSubmit={handleQuickPayment} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Date *</label>
              <input
                type="date"
                required
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount Paid (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Oil Company *</label>
              <select
                value={payForm.oilCompany}
                onChange={(e) => setPayForm({ ...payForm, oilCompany: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              >
                <option value="HP Gas">HP Gas</option>
                <option value="Indane">Indane</option>
                <option value="Bharat Gas">Bharat Gas</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Mode *</label>
              <select
                value={payForm.paymentMode}
                onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice / Bill Number</label>
              <input
                type="text"
                placeholder="e.g. HP/INV/2026/0045"
                value={payForm.invoiceNo}
                onChange={(e) => setPayForm({ ...payForm, invoiceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">UTR / Txn Reference No.</label>
              <input
                type="text"
                placeholder="e.g. N123456789012"
                value={payForm.referenceNo}
                onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Associated Cylinder Product</label>
              <select
                value={payForm.productId}
                onChange={(e) => setPayForm({ ...payForm, productId: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              >
                <option value="NONE">None / Multiple / Mixed</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity (Cylinders)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 200"
                value={payForm.qtyCylinders}
                onChange={(e) => setPayForm({ ...payForm, qtyCylinders: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Remarks</label>
            <textarea
              placeholder="Any additional notes..."
              value={payForm.description}
              onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
              rows={2}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickPayModal(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-750 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Physical Asset Details Modal */}
      <Modal open={editAssetModal} onClose={() => setEditAssetModal(false)} title="Update Physical Asset / Renewal Schedule" size="sm">
        <form onSubmit={handleAssetUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asset Name / Reg. No.</label>
            <input
              type="text"
              disabled
              value={activeAsset?.name || ""}
              className="input bg-slate-50 cursor-not-allowed text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asset Type</label>
            <input
              type="text"
              disabled
              value={activeAsset?.assetType || ""}
              className="input bg-slate-50 cursor-not-allowed text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asset Price / Valuation (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={assetForm.price}
              onChange={(e) => setAssetForm({ ...assetForm, price: e.target.value })}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Renewal Date</label>
            <input
              type="date"
              value={assetForm.nextRenewalDate}
              onChange={(e) => setAssetForm({ ...assetForm, nextRenewalDate: e.target.value })}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Comment / Note</label>
            <input
              type="text"
              value={assetForm.comment}
              onChange={(e) => setAssetForm({ ...assetForm, comment: e.target.value })}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditAssetModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
