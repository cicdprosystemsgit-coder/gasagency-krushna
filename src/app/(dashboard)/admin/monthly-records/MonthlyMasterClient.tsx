"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Users,
  Truck,
  Package,
  Landmark,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Search,
  Filter,
  Layers,
  Wrench,
  Fuel,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ShieldCheck,
  CalendarDays,
  Lock,
  BookOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveMonthlyMasterSheet,
  getMonthlyDaySheet,
  type MonthlyMasterSheetData,
  type DailyGodownSheetData,
} from "@/app/actions/monthly-records";
import DailyGodownSheet from "./DailyGodownSheet";

interface Props {
  initialData: MonthlyMasterSheetData;
  userRole?: string;
}

export function MonthlyMasterClient({ initialData, userRole = "ADMIN" }: Props) {
  const router = useRouter();
  const [data, setData] = useState<MonthlyMasterSheetData>(initialData);
  const [activeTab, setActiveTab] = useState<
    "summary" | "salary" | "credit" | "distribution" | "stock" | "fleetDigital"
  >("summary");
  const [isPending, startTransition] = useTransition();

  // Day Browser state
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [dailySheetData, setDailySheetData] = useState<DailyGodownSheetData | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState(false);

  // Search filters
  const [creditSearch, setCreditSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const {
    year,
    month,
    monthLabel,
    dateRangeStr,
    salaryAdvances,
    creditLedgers,
    driverDistributions,
    specialPoints,
    dailyProfits,
    stockDetails,
    vehicleExpenses,
    digitalCollections,
    bankAccounts,
    counterServices,
    grandReconciliation,
  } = data;

  // Month navigation
  const handleMonthChange = (offset: number) => {
    let nextMonth = month + offset;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    router.push(`/admin/monthly-records?year=${nextYear}&month=${nextMonth}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveMonth = () => {
    startTransition(async () => {
      const res = await saveMonthlyMasterSheet({
        year,
        month,
        lock: true,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Monthly Master Sheet for ${monthLabel} locked & saved!`);
        setData((prev) => ({ ...prev, isLocked: true }));
        router.refresh();
      }
    });
  };

  // Day Browser: load data for a specific day
  const daysInMonth = new Date(year, month, 0).getDate();

  const handleDayChange = useCallback(async (newDay: number) => {
    if (newDay < 1 || newDay > daysInMonth) return;
    setSelectedDay(newDay);
    setIsDailyLoading(true);
    const result = await getMonthlyDaySheet(year, month, newDay);
    setIsDailyLoading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setDailySheetData(result);
    }
  }, [year, month, daysInMonth]);

  const handleEnterDayBrowser = useCallback(async () => {
    setViewMode("daily");
    if (!dailySheetData) {
      await handleDayChange(selectedDay);
    }
  }, [viewMode, dailySheetData, selectedDay, handleDayChange]);

  const handleExitDayBrowser = useCallback(() => {
    setViewMode("monthly");
  }, []);

  // Filtered lists
  const filteredCredits = useMemo(() => {
    if (!creditSearch) return creditLedgers;
    const q = creditSearch.toLowerCase();
    return creditLedgers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.routeOrArea && c.routeOrArea.toLowerCase().includes(q))
    );
  }, [creditLedgers, creditSearch]);

  const filteredStocks = useMemo(() => {
    if (!stockSearch) return stockDetails;
    const q = stockSearch.toLowerCase();
    return stockDetails.filter((s) => s.productName.toLowerCase().includes(q));
  }, [stockDetails, stockSearch]);

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION BAR & MONTH SELECTOR ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {monthLabel} (मासिक हिशोब)
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {dateRangeStr}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Google Sheet Mirror: Monthly Executive Ledger, P&amp;L, Payroll, Inventory &amp; Fleet Records
            </p>
          </div>
        </div>

        {/* Month Arrows & Actions */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end flex-wrap border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 print:hidden">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-700 min-w-[90px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            type="button"
            className="btn btn-secondary text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={handleEnterDayBrowser}
            type="button"
            className="btn btn-secondary text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 shadow-2xs border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Day Browser</span>
          </button>

          <button
            onClick={handleSaveMonth}
            disabled={isPending}
            type="button"
            className="btn btn-primary text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPending ? "Locking..." : "Lock Month"}</span>
          </button>
        </div>
      </div>

      {/* ── DAY BROWSER MODE ──────────────────────────────────────────────────── */}
      {viewMode === "daily" && (
        <div className="space-y-4">
          {/* Day browser header bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-black text-blue-900">
                Day Browser — {monthLabel}
              </span>
              <span className="text-xs text-blue-600 font-medium">
                (Daily Godown Sheet / दैनिक गोडाऊन पत्रक)
              </span>
            </div>
            <button
              onClick={handleExitDayBrowser}
              className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all"
              title="Back to Monthly View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {dailySheetData ? (
            <DailyGodownSheet
              data={dailySheetData}
              year={year}
              month={month}
              day={selectedDay}
              daysInMonth={daysInMonth}
              onDayChange={handleDayChange}
              isLoading={isDailyLoading}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              {isDailyLoading ? (
                <>
                  <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-3" />
                  <p className="text-sm font-medium">Loading day data...</p>
                </>
              ) : (
                <>
                  <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Select a day to view godown sheet</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MONTHLY VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === "monthly" && (
        <div className="space-y-4">

      {/* ── KPI METRICS RIBBON ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Opening Cash */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">सुरुवातीची रक्कम (Opening)</p>
            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-700">
            ₹{grandReconciliation.openingCash.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Opening cash on 1st</p>
        </div>

        {/* Cylinder Revenue */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">सिलेंडर महिना रक्कम</p>
            <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-indigo-700">
            ₹{Math.round(grandReconciliation.cylinderRevenue).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total cylinder sales</p>
        </div>

        {/* Vehicle Fuel & Repairs */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">गाड्या डीझेल व दुरुस्ती</p>
            <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-amber-700">
            ₹{grandReconciliation.vehicleFuelAndRepairs.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fuel &amp; fleet maintenance</p>
        </div>

        {/* Total Monthly Profit */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">एकूण नफा (Total Profit)</p>
            <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-700">
            ₹{grandReconciliation.totalProfitMonth.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sum of daily profit (01-31)</p>
        </div>

        {/* Closing Cash in Hand */}
        <div className="rounded-xl p-3.5 bg-emerald-50/70 border border-emerald-300 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">शिल्लक रक्कम (Closing Cash)</p>
            <div className="w-5 h-5 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-900">
            ₹{grandReconciliation.closingCashInHand.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Net physical safe cash</p>
        </div>
      </div>

      {/* ── 6 TABS SELECTOR ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "summary"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>1. संपूर्ण हिशोब व नफा (P&amp;L)</span>
        </button>

        <button
          onClick={() => setActiveTab("salary")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "salary"
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. उचल / पगार ({salaryAdvances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("credit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "credit"
              ? "bg-white text-amber-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>3. उधारी खाते ({creditLedgers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("distribution")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "distribution"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>4. एकूण वाटप (Distribution)</span>
        </button>

        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "stock"
              ? "bg-white text-purple-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>5. स्टॉक तपशील ({stockDetails.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("fleetDigital")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all shrink-0 ${
            activeTab === "fleetDigital"
              ? "bg-white text-teal-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>6. गाड्या, डिजिटल व बँक</span>
        </button>
      </div>

      {/* ── TAB 1: संपूर्ण हिशोब व दैनिक नफा (GRAND CASH P&L) ───────────────── */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 14-point Grand Cash Statement */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>संपूर्ण महिन्याचा एकूण हिशोब (Monthly Cash Flow Reconciliation)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct replica of Client Google Sheet Section: Inflows vs Outflows vs Net Cash
                </p>
              </div>
              <span className="badge badge-neutral text-xs font-mono font-bold">{monthLabel}</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Line 1 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span className="font-semibold text-slate-800">सुरुवातीची (01/{String(month).padStart(2, "0")}/{year}) रक्कम</span>
                </div>
                <span className="font-extrabold text-slate-900 text-sm">₹{grandReconciliation.openingCash.toLocaleString()}</span>
              </div>

              {/* Line 2 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 bg-blue-50/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span className="font-semibold text-slate-800">महिन्याची एकूण सिलेंडरची रक्कम</span>
                </div>
                <span className="font-extrabold text-blue-700 text-sm">₹{grandReconciliation.cylinderRevenue.toLocaleString()}</span>
              </div>

              {/* Line 3 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span className="font-semibold text-slate-800">गाड्यांचे डीझेल / पेट्रोल / दुरुस्ती</span>
                </div>
                <span className="font-bold text-red-600 text-sm">- ₹{grandReconciliation.vehicleFuelAndRepairs.toLocaleString()}</span>
              </div>

              {/* Line 4 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">4</span>
                  <span className="font-semibold text-slate-800">महिन्याची चालू उधारी (New Credit Given)</span>
                </div>
                <span className="font-bold text-slate-700 text-sm">₹{creditLedgers.reduce((s, c) => s + c.currentCredit, 0).toLocaleString()}</span>
              </div>

              {/* Line 5 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 bg-emerald-50/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">5</span>
                  <span className="font-semibold text-slate-800">महिन्याची उधारी जमा (Credit Recovered)</span>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm">+ ₹{grandReconciliation.creditRecovered.toLocaleString()}</span>
              </div>

              {/* Line 6 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">6</span>
                  <span className="font-semibold text-slate-800">ऑनलाईन आलेली रक्कम (Online Directly to Bank)</span>
                </div>
                <span className="font-bold text-purple-700 text-sm">₹{grandReconciliation.digitalReceivedTotal.toLocaleString()}</span>
              </div>

              {/* Line 7 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">7</span>
                  <span className="font-semibold text-slate-800">महिन्याची सिलेंडर व्यतिरिक्त आलेली रक्कम (Stoves, Pipes)</span>
                </div>
                <span className="font-bold text-emerald-700 text-sm">+ ₹{grandReconciliation.nonCylinderRevenue.toLocaleString()}</span>
              </div>

              {/* Line 8 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">8</span>
                  <span className="font-semibold text-slate-800">महिन्याची ऑफिस व्यतिरिक्त आलेली रक्कम</span>
                </div>
                <span className="font-bold text-slate-700 text-sm">+ ₹{grandReconciliation.otherOfficeReceipts.toLocaleString()}</span>
              </div>

              {/* Line 9 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold">9</span>
                  <span className="font-semibold text-slate-800">महिन्याचा ऑफिस व्यतिरिक्त खर्च</span>
                </div>
                <span className="font-bold text-red-600 text-sm">- ₹{grandReconciliation.otherOfficeExpenses.toLocaleString()}</span>
              </div>

              {/* Line 10 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold">10</span>
                  <span className="font-semibold text-slate-800">महिन्याचा ऑफिस खर्च (Rent, Hamali, Electricity)</span>
                </div>
                <span className="font-bold text-red-600 text-sm">- ₹{grandReconciliation.officeExpenses.toLocaleString()}</span>
              </div>

              {/* Line 11 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">11</span>
                  <span className="font-semibold text-slate-800">महिन्याची उचल (Advances Paid to Staff)</span>
                </div>
                <span className="font-bold text-amber-700 text-sm">- ₹{grandReconciliation.salaryAdvancePaidTotal.toLocaleString()}</span>
              </div>

              {/* Line 12 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">12</span>
                  <span className="font-semibold text-slate-800">भरत पाटील हिशोब (Partner Drawings / Settlement)</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">₹{grandReconciliation.partnerDrawings.toLocaleString()}</span>
              </div>

              {/* Line 13 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">13</span>
                  <span className="font-semibold text-slate-800">19 KG सिलेंडरची रक्कम (Commercial Separate)</span>
                </div>
                <span className="font-bold text-indigo-700 text-sm">₹{grandReconciliation.commercial19KgAmount.toLocaleString()}</span>
              </div>

              {/* Line 14 */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">14</span>
                  <span className="font-semibold text-slate-800">बँक भरणा (Physical Cash Deposited into Bank)</span>
                </div>
                <span className="font-bold text-blue-700 text-sm">- ₹{grandReconciliation.bankDeposits.toLocaleString()}</span>
              </div>

              {/* Final Result: शिल्लक रक्कम */}
              <div className="p-4 bg-emerald-50/90 flex items-center justify-between border-t-2 border-emerald-300">
                <div>
                  <p className="font-black text-emerald-950 text-sm uppercase tracking-wider">
                    👉 शिल्लक रक्कम (Net Physical Cash in Safe)
                  </p>
                  <p className="text-[11px] text-emerald-700">Calculated physical cash balance at end of month</p>
                </div>
                <span className="text-xl font-black text-emerald-900 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-emerald-300">
                  ₹{grandReconciliation.closingCashInHand.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Profit / Day (01 to 31) Calendar List */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Profit / Day (दैनिक नफा)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Day-by-day profit record for all days (01 to 31)</p>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Total: ₹{grandReconciliation.totalProfitMonth.toLocaleString()}
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100/90 z-10 border-b border-slate-200">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3.5">Day / Date</th>
                    <th className="py-2.5 px-3 text-center">Deliveries</th>
                    <th className="py-2.5 px-3 text-right">Collection</th>
                    <th className="py-2.5 px-3.5 text-right bg-emerald-50/50 text-emerald-900">Profit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyProfits.map((dp) => (
                    <tr key={dp.dayNumber} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3.5 font-mono font-bold text-slate-800">
                        {dp.dateStr}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-medium">
                        {dp.deliveriesCount || "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        {dp.collectionAmount > 0 ? `₹${dp.collectionAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2 px-3.5 text-right font-extrabold text-emerald-700 bg-emerald-50/30">
                        {dp.profit > 0 ? `₹${dp.profit.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: उचल / पगार (STAFF ADVANCES & SALARIES) ───────────────────── */}
      {activeTab === "salary" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>उचल / पगार (Staff Advance, Repayment &amp; Salary Ledger)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula: <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">शिल्लक = (मागील उचल + चालू उचल - जमा) - महिन्याचा पगार</code>
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg">
              {salaryAdvances.length} Employees Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">नाव (Employee Name)</th>
                  <th className="py-3 px-3 text-right">मागील उचल (Prev Advance)</th>
                  <th className="py-3 px-3 text-right bg-amber-50/40 text-amber-900">ह्या महिन्याची उचल</th>
                  <th className="py-3 px-3 text-right">ह्या महिन्यात जमा (Repaid)</th>
                  <th className="py-3 px-3 text-right bg-blue-50/40 text-blue-900">महिन्याचा पगार (Salary)</th>
                  <th className="py-3 px-4 text-right bg-indigo-50/50 text-indigo-950 font-extrabold">शिल्लक / बाकी (Balance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaryAdvances.map((emp) => {
                  const isDueFromStaff = emp.netBalance > 0;
                  const isPayableToStaff = emp.netBalance < 0;

                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{emp.employeeName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{emp.employeeRole.toLowerCase()}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        ₹{emp.prevAdvance.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700 bg-amber-50/20">
                        ₹{emp.monthAdvance.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        ₹{emp.advanceRepaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-700 bg-blue-50/20">
                        ₹{emp.monthlySalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold bg-indigo-50/30">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                            isDueFromStaff
                              ? "bg-red-100 text-red-700"
                              : isPayableToStaff
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isPayableToStaff
                            ? `-₹${Math.abs(emp.netBalance).toLocaleString()} (Payable)`
                            : isDueFromStaff
                            ? `₹${emp.netBalance.toLocaleString()} (Due)`
                            : "₹0"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-xs text-slate-900">
                  <td className="py-3.5 px-4 uppercase tracking-wider">एकूण (Total Sum)</td>
                  <td className="py-3.5 px-3 text-right">
                    ₹{salaryAdvances.reduce((s, a) => s + a.prevAdvance, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-800">
                    ₹{salaryAdvances.reduce((s, a) => s + a.monthAdvance, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-800">
                    ₹{salaryAdvances.reduce((s, a) => s + a.advanceRepaid, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-blue-800">
                    ₹{salaryAdvances.reduce((s, a) => s + a.monthlySalary, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-indigo-950 font-black text-sm">
                    ₹{salaryAdvances.reduce((s, a) => s + a.netBalance, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: उधारी (CUSTOMER & COMMERCIAL CREDIT LEDGER) ───────────────── */}
      {activeTab === "credit" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>उधारी खाते (Customer, Village Point &amp; Commercial Credit Ledger)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula: <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">उधारी बाकी = मागील उधारी + चालू उधारी - उधारी जमा</code>
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={creditSearch}
                onChange={(e) => setCreditSearch(e.target.value)}
                placeholder="Search account / route..."
                className="input w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">नाव (Customer / Route Name)</th>
                  <th className="py-3 px-3 text-right">मागील उधारी (Opening)</th>
                  <th className="py-3 px-3 text-right bg-amber-50/40 text-amber-900">चालू उधारी (New Credit)</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/40 text-emerald-900">उधारी जमा (Recovered)</th>
                  <th className="py-3 px-4 text-right bg-indigo-50/50 text-indigo-950 font-extrabold">उधारी बाकी (Closing Due)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCredits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No credit accounts found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredCredits.map((c) => (
                    <tr key={c.accountId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <p>{c.name}</p>
                        {c.routeOrArea && <p className="text-[10px] font-medium text-slate-400">{c.routeOrArea}</p>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        ₹{c.openingCredit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700 bg-amber-50/20">
                        ₹{c.currentCredit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-emerald-50/20">
                        ₹{c.creditDeposited.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-indigo-950 bg-indigo-50/30">
                        ₹{c.closingCredit.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-xs text-slate-900">
                  <td className="py-3.5 px-4 uppercase tracking-wider">एकूण (Total Sum)</td>
                  <td className="py-3.5 px-3 text-right">
                    ₹{creditLedgers.reduce((s, c) => s + c.openingCredit, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-800">
                    ₹{creditLedgers.reduce((s, c) => s + c.currentCredit, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-800">
                    ₹{creditLedgers.reduce((s, c) => s + c.creditDeposited, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-indigo-950 font-black text-sm">
                    ₹{creditLedgers.reduce((s, c) => s + c.closingCredit, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: एकूण वाटप (MONTHLY CYLINDER DISTRIBUTION) ─────────────────── */}
      {activeTab === "distribution" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>एकूण वाटप (Driver-wise Monthly Cylinder Delivery Breakdown)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Month-long distribution for each delivery boy and special points
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Sr. No / Driver Name</th>
                    <th className="py-3 px-4 text-center bg-blue-50/40 text-blue-900">14.2 kg (Domestic)</th>
                    <th className="py-3 px-4 text-center bg-indigo-50/40 text-indigo-900">19 kg (Commercial)</th>
                    <th className="py-3 px-4 text-center">5 kg (Dom / Com)</th>
                    <th className="py-3 px-4 text-center font-extrabold bg-slate-100 text-slate-900">एकूण (Total Cylinders)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Delivery Boys */}
                  {driverDistributions.map((d, idx) => (
                    <tr key={d.driverId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        <span>{d.driverName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-blue-700 bg-blue-50/20 text-sm">
                        {d.cylinder14Qty}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-indigo-700 bg-indigo-50/20 text-sm">
                        {d.cylinder19Qty}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {d.cylinder5DomQty + d.cylinder5ComQty}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-slate-900 bg-slate-50 text-sm">
                        {d.totalCylinders}
                      </td>
                    </tr>
                  ))}

                  {/* Special Points Header */}
                  <tr className="bg-slate-100/70 font-bold text-slate-700 text-[11px]">
                    <td colSpan={5} className="py-2.5 px-4 uppercase tracking-wider">
                      विशेष वाटप बिंदू (Special Distribution Points)
                    </td>
                  </tr>

                  {specialPoints.map((sp) => (
                    <tr key={sp.driverId} className="hover:bg-slate-50/50 bg-indigo-50/10">
                      <td className="py-3 px-4 font-bold text-indigo-950 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>{sp.driverName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-blue-700 text-sm">
                        {sp.cylinder14Qty}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-indigo-700 text-sm">
                        {sp.cylinder19Qty}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">0</td>
                      <td className="py-3 px-4 text-center font-black text-indigo-950 text-sm">
                        {sp.totalCylinders}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-xs text-slate-900">
                    <td className="py-3.5 px-4 uppercase tracking-wider">एकूण वाटप (Grand Total)</td>
                    <td className="py-3.5 px-4 text-center text-blue-800 text-base">
                      {driverDistributions.reduce((s, d) => s + d.cylinder14Qty, 0) +
                        specialPoints.reduce((s, p) => s + p.cylinder14Qty, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-indigo-800 text-base">
                      {driverDistributions.reduce((s, d) => s + d.cylinder19Qty, 0) +
                        specialPoints.reduce((s, p) => s + p.cylinder19Qty, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      {driverDistributions.reduce((s, d) => s + d.cylinder5DomQty + d.cylinder5ComQty, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-950 font-black text-base">
                      {driverDistributions.reduce((s, d) => s + d.totalCylinders, 0) +
                        specialPoints.reduce((s, p) => s + p.totalCylinders, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: स्टॉक तपशील (MONTHLY STOCK DETAILS & VALUATION) ───────────── */}
      {activeTab === "stock" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>स्टॉक तपशील (Monthly Stock, Loads, Sales &amp; Valuation)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula: <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">Closing = Opening + Load - Sale - NC</code> and <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">Amount = Closing × Rate</code>
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search cylinder, stove, fitting..."
                className="input w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product Category &amp; Item</th>
                  <th className="py-3 px-3 text-center bg-amber-50/40 text-amber-900">Opening Stock</th>
                  <th className="py-3 px-3 text-center">Load (Inward)</th>
                  <th className="py-3 px-3 text-center bg-blue-50/40 text-blue-900">Sale (Sold)</th>
                  <th className="py-3 px-3 text-center">NC (New Conn)</th>
                  <th className="py-3 px-3 text-center bg-purple-50/40 text-purple-900 font-extrabold">Closing Stock</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-950 font-extrabold">Amount (Valuation)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.map((stk) => (
                  <tr key={stk.productId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{stk.productName}</p>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{stk.category}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-800 bg-amber-50/20">
                      {stk.openingStock}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {stk.loadQty}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20">
                      {stk.saleQty}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {stk.ncQty}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-purple-900 bg-purple-50/30">
                      {stk.closingStock}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      ₹{stk.rate.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-950 bg-emerald-50/30">
                      ₹{stk.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-xs text-slate-900">
                  <td className="py-3.5 px-4 uppercase tracking-wider">एकूण किंमत (Total Valuation)</td>
                  <td className="py-3.5 px-3 text-center">
                    {stockDetails.reduce((s, x) => s + x.openingStock, 0)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {stockDetails.reduce((s, x) => s + x.loadQty, 0)}
                  </td>
                  <td className="py-3.5 px-3 text-center text-blue-800">
                    {stockDetails.reduce((s, x) => s + x.saleQty, 0)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {stockDetails.reduce((s, x) => s + x.ncQty, 0)}
                  </td>
                  <td className="py-3.5 px-3 text-center text-purple-900 font-black">
                    {stockDetails.reduce((s, x) => s + x.closingStock, 0)}
                  </td>
                  <td className="py-3.5 px-3 text-right">—</td>
                  <td className="py-3.5 px-4 text-right text-emerald-950 font-black text-sm">
                    ₹{stockDetails.reduce((s, x) => s + x.amount, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: गाड्या, डिजिटल व बँक (FLEET, DIGITAL, BANKS & COUNTER) ─────── */}
      {activeTab === "fleetDigital" && (
        <div className="space-y-6">
          {/* Row 1: Vehicle Maintenance & Diesel */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  <span>गाड्या दुरुस्ती / डीझेल (Vehicle Maintenance &amp; Fuel Expenses)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Per-vehicle maintenance and diesel cost breakdown</p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                Total: ₹{vehicleExpenses.reduce((s, v) => s + v.totalExpense, 0).toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">गाडी नंबर (Vehicle No / Name)</th>
                    <th className="py-2.5 px-4 text-right">दुरुस्ती (Maintenance)</th>
                    <th className="py-2.5 px-4 text-right">डीझेल (Diesel)</th>
                    <th className="py-2.5 px-4 text-right font-extrabold bg-slate-100 text-slate-900">एकूण (Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleExpenses.map((v) => (
                    <tr key={v.vehicleId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        <span>{v.vehicleNo}</span>
                        <span className="text-slate-400 font-sans text-[11px] ml-2">({v.vehicleName})</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">
                        ₹{v.maintenanceExpense.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-amber-700">
                        ₹{v.dieselExpense.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 bg-slate-50">
                        ₹{v.totalExpense.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2: Digital Collections & Bank Accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Digital Collections */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>एकूण डिजिटल रक्कम (Digital Payment Channels)</span>
                </h4>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3.5">माध्यम (Channel)</th>
                    <th className="py-2.5 px-3 text-right">रक्कम (Reported)</th>
                    <th className="py-2.5 px-3 text-right">आलेली (Settled)</th>
                    <th className="py-2.5 px-3.5 text-right">फरक (Variance)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {digitalCollections.map((dc) => (
                    <tr key={dc.channel} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{dc.channelLabel}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        ₹{dc.recordedAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        ₹{dc.receivedAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-500">
                        {dc.variance === 0 ? "✓ 0" : `₹${dc.variance}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-black border-t border-slate-300 text-xs">
                    <td className="py-2.5 px-3.5 uppercase">एकूण (Total)</td>
                    <td className="py-2.5 px-3 text-right">
                      ₹{digitalCollections.reduce((s, d) => s + d.recordedAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800">
                      ₹{digitalCollections.reduce((s, d) => s + d.receivedAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black">
                      ₹{digitalCollections.reduce((s, d) => s + d.variance, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bank Accounts */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <span>बँक तपशील (Agency Bank Accounts)</span>
                </h4>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3.5">बँक (Bank Name)</th>
                    <th className="py-2.5 px-3 text-right">Opening</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3.5 text-right font-extrabold bg-blue-50/40 text-blue-950">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankAccounts.map((b) => (
                    <tr key={b.accountId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{b.bankName}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{b.openingBalance.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">₹{b.creditAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-red-600">₹{b.debitAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-blue-900 bg-blue-50/20">₹{b.closingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Counter Extra Services */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>काउंटर सेवा (Counter Services: EKYC, Name Change, Form, Refill Fees)</span>
              </h4>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Total: ₹{counterServices.reduce((s, c) => s + c.totalAmount, 0).toLocaleString()}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Operator / Staff Name</th>
                    <th className="py-2.5 px-3 text-right">EKYC</th>
                    <th className="py-2.5 px-3 text-right">Name Change</th>
                    <th className="py-2.5 px-3 text-right">Form KYC</th>
                    <th className="py-2.5 px-3 text-right">Refill Service</th>
                    <th className="py-2.5 px-4 text-right font-extrabold bg-emerald-50/50 text-emerald-950">एकूण (Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {counterServices.map((cs) => (
                    <tr key={cs.staffId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{cs.staffName}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{cs.ekycAmount}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{cs.nameChangeAmount}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{cs.formAmount}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">₹{cs.refillService.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-950 bg-emerald-50/20">₹{cs.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
}

