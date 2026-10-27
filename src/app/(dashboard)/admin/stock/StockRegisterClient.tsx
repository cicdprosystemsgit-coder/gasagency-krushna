"use client";

import React, { useState, useTransition, useEffect, Fragment } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Save,
  RotateCcw,
  Truck,
  Building2,
  Package,
  Layers,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Receipt,
  User,
  History,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  saveDailyStockAudit,
  updateAgencyStockLimits,
  CylinderCategorySummary,
  StaffStockBalance,
  DeliveryBoyUdhariRecord,
} from "@/app/actions/daily-stock-register";
import {
  getProductStockMovementHistory,
  ProductStockHistoryEvent,
} from "@/app/actions/product-stock-history";

interface ProductItem {
  id: string;
  name: string;
  unitCost: number;
  saleRate: number;
  isCylinder: boolean;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  addedByName: string;
}

interface StockRegisterClientProps {
  initialDate: string;
  initialData: {
    categories: CylinderCategorySummary[];
    staffBalances: StaffStockBalance[];
    cashNotes: Record<string, number>;
    expenses: ExpenseItem[];
    registerRecord: any;
    deliveryBoyUdhariSummary?: DeliveryBoyUdhariRecord[];
  };
  products: ProductItem[];
  userRole: string;
}

export function StockRegisterClient({
  initialDate,
  initialData,
  products,
  userRole,
}: StockRegisterClientProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [activeTab, setActiveTab] = useState<"summary" | "staff" | "cash" | "delivery_udhari" | "product_history">("summary");
  const [categories, setCategories] = useState(initialData.categories);
  const [staffBalances, setStaffBalances] = useState(initialData.staffBalances);
  const [expenses, setExpenses] = useState(initialData.expenses);
  const deliveryBoyUdhariList = initialData.deliveryBoyUdhariSummary || [];
  const totalShortageToday = deliveryBoyUdhariList.reduce((sum, d) => sum + (d.shortageAmount || 0), 0);
  const totalUdhariBooked = deliveryBoyUdhariList
    .filter((d) => d.shortageAddedToUdhari)
    .reduce((sum, d) => sum + (d.shortageAmount || 0), 0);
  const totalOutstandingUdhariSum = deliveryBoyUdhariList.reduce((sum, d) => sum + (d.totalOutstandingUdhari || 0), 0);
  const hasShortages = totalShortageToday > 0;
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Cash notes state
  const [cashNotes, setCashNotes] = useState<Record<string, number>>({
    n2000: initialData.cashNotes.n2000 || 0,
    n500: initialData.cashNotes.n500 || 0,
    n200: initialData.cashNotes.n200 || 0,
    n100: initialData.cashNotes.n100 || 0,
    n50: initialData.cashNotes.n50 || 0,
    n20: initialData.cashNotes.n20 || 0,
    n10: initialData.cashNotes.n10 || 0,
    coins: initialData.cashNotes.coins || 0,
  });

  // Physical stock count state (for physical audit differences)
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, { full: string; empty: string }>>(() => {
    const map: Record<string, { full: string; empty: string }> = {};
    initialData.categories.forEach((cat) => {
      const saved = initialData.registerRecord?.physicalStock?.[cat.categoryKey];
      map[cat.categoryKey] = {
        full: saved?.full !== undefined ? String(saved.full) : "",
        empty: saved?.empty !== undefined ? String(saved.empty) : "",
      };
    });
    return map;
  });

  // Product History Tab state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [productEvents, setProductEvents] = useState<ProductStockHistoryEvent[]>([]);
  const [productStats, setProductStats] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Calculate Cash Total
  const cashTotal =
    (cashNotes.n2000 || 0) * 2000 +
    (cashNotes.n500 || 0) * 500 +
    (cashNotes.n200 || 0) * 200 +
    (cashNotes.n100 || 0) * 100 +
    (cashNotes.n50 || 0) * 50 +
    (cashNotes.n20 || 0) * 20 +
    (cashNotes.n10 || 0) * 10 +
    (cashNotes.coins || 0);

  // Quick Date Navigation
  const changeDateBy = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    const nextDate = cur.toISOString().slice(0, 10);
    window.location.href = `?date=${nextDate}`;
  };

  // Fetch product movement history
  useEffect(() => {
    if (!selectedProductId || activeTab !== "product_history") return;
    let active = true;
    setHistoryLoading(true);

    getProductStockMovementHistory(selectedProductId)
      .then((res) => {
        if (!active) return;
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setProductEvents(res.events || []);
          setProductStats(res.stats || null);
        }
        setHistoryLoading(false);
      })
      .catch(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProductId, activeTab]);

  // Agency Owner Stock Limits State
  const isOwner = ["ADMIN", "MANAGER"].includes(userRole);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [limitsForm, setLimitsForm] = useState<Record<string, { minStock: number; maxStock: number }>>(() => {
    const map: Record<string, { minStock: number; maxStock: number }> = {};
    initialData.categories.forEach((cat) => {
      map[cat.categoryKey] = {
        minStock: cat.minStock ?? 0,
        maxStock: cat.maxStock ?? 0,
      };
    });
    return map;
  });

  const lowStockCategories = categories.filter(
    (c) => c.minStock !== undefined && c.minStock > 0 && c.closingFull < c.minStock
  );
  const overStockCategories = categories.filter(
    (c) => c.maxStock !== undefined && c.maxStock > 0 && c.closingFull > c.maxStock
  );

  const handleSaveStockLimits = () => {
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await updateAgencyStockLimits(limitsForm, selectedDate);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Agency stock limits updated successfully! (साठा मर्यादा यशस्वीरित्या जतन करण्यात आल्या)");
        setIsLimitsModalOpen(false);

        setCategories((prev) =>
          prev.map((cat) => {
            const updated = limitsForm[cat.categoryKey];
            if (!updated) return cat;
            const minStock = Number(updated.minStock) || 0;
            const maxStock = Number(updated.maxStock) || 0;
            let stockStatus: "LOW" | "NORMAL" | "OVERSTOCK" = "NORMAL";
            if (minStock > 0 && cat.closingFull < minStock) {
              stockStatus = "LOW";
            } else if (maxStock > 0 && cat.closingFull > maxStock) {
              stockStatus = "OVERSTOCK";
            }
            return {
              ...cat,
              minStock,
              maxStock,
              stockStatus,
            };
          })
        );
      }
    });
  };

  // Save audit counts & cash notes
  const handleSaveAudit = () => {
    setErrorMsg("");
    setSuccessMsg("");

    const formattedPhysical: Record<string, { full: number; empty: number }> = {};
    Object.entries(physicalCounts).forEach(([catKey, val]) => {
      formattedPhysical[catKey] = {
        full: parseInt(val.full || "0", 10),
        empty: parseInt(val.empty || "0", 10),
      };
    });

    startTransition(async () => {
      const res = await saveDailyStockAudit({
        date: selectedDate,
        cashNotes: { ...cashNotes, total: cashTotal },
        physicalStock: formattedPhysical,
        stockLimits: limitsForm,
        status: "VERIFIED",
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Daily Stock counts & Cash Tally saved successfully!");
      }
    });
  };

  // Filtered product history
  const filteredEvents = productEvents.filter((ev) => {
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase();
    return (
      ev.typeLabel.toLowerCase().includes(term) ||
      ev.sourceOrParty.toLowerCase().includes(term) ||
      ev.notes.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              Daily Stock &amp; Cylinder Tally Register
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Daily Reconciliation
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              Complete physical vs. computer stock balance, staff cylinder ledger, and daily cash denominations.
            </p>
          </div>
        </div>

        {/* Date Selector & Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => changeDateBy(-1)}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.href = `?date=${e.target.value}`;
                }
              }}
              className="bg-transparent border-none text-xs font-bold text-zinc-800 px-2.5 py-1 focus:outline-none"
            />
            <button
              onClick={() => changeDateBy(1)}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isOwner && (
            <button
              onClick={() => setIsLimitsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 shadow-2xs transition cursor-pointer"
              title="Set Minimum & Maximum Stock Limits"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Stock Limits (साठा मर्यादा)</span>
            </button>
          )}

          <button
            onClick={handleSaveAudit}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isPending ? "Saving..." : "Save Daily Tally"}
          </button>
        </div>
      </div>

      {/* Success & Error Banners */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-800 font-bold">
            ✕
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg("")} className="text-rose-800 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-zinc-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          1. Cylinder Stock Balance (दैनिक गोषवारा)
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "staff"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <User className="w-4 h-4" />
          2. Staff Empty Balance (खाली सिलेंडर जमा बाकी)
          {staffBalances.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {staffBalances.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("cash")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "cash"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Banknote className="w-4 h-4" />
          3. Cash Denominations &amp; Expenses (रोकड व खर्च)
        </button>
        <button
          onClick={() => setActiveTab("delivery_udhari")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "delivery_udhari"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          4. Delivery Boy Udhari &amp; Cash (डिलिव्हरी बॉय रोख व उधारी)
          {deliveryBoyUdhariList.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                hasShortages ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {deliveryBoyUdhariList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("product_history")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === "product_history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <History className="w-4 h-4" />
          5. Per-Product Movement History (उत्पादन इतिहास व लेजर)
        </button>
      </div>

      {/* TAB 1: CYLINDER STOCK BALANCE SUMMARY (EXCEL SHEET 1 & 2 REPLICA) */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Low Stock Warning Banner */}
          {lowStockCategories.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950 flex items-center gap-2">
                    Low Stock Alert (कमी साठा इशारा)
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                      {lowStockCategories.length} {lowStockCategories.length === 1 ? "Category" : "Categories"} below limit
                    </span>
                  </h4>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    {lowStockCategories.map((c) => `${c.label}: Current Full ${c.closingFull} (Min Limit: ${c.minStock})`).join(" • ")}
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => setIsLimitsModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                >
                  Adjust Stock Limits
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-850">
                  Cylinder Stock Balance &amp; Audit Sheet (माळाचा तपशील व गोषवारा)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Opening stock, truck receipts, deliveries, NC/TV, returned empties, and closing balance.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-zinc-700 bg-white px-3 py-1.5 rounded-lg border border-zinc-200">
                  Date: {selectedDate}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100/75 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 min-w-[160px]">Particulars (तपशील)</th>
                    {categories.map((c) => (
                      <th key={c.categoryKey} colSpan={2} className="px-3 py-2 text-center border-l border-zinc-200">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold text-[10px]">
                    <th className="px-4 py-2">Movement Category</th>
                    {categories.map((c) => (
                      <Fragment key={`sub-${c.categoryKey}`}>
                        <th className="px-2 py-1 text-center border-l border-zinc-200 bg-blue-50/50 text-blue-900">
                          Full (फुल)
                        </th>
                        <th className="px-2 py-1 text-center bg-zinc-100 text-zinc-700">
                          MT / Empty (खाली)
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800">
                  {/* Row 1: Opening Stock */}
                  <tr className="hover:bg-zinc-50/80 font-medium">
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      Opening Stock (सुरवातीचा माल)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`open-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center font-bold text-blue-700 border-l border-zinc-200">
                          {c.openingFull}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-600">
                          {c.openingEmpty}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 2: Truck Load Received */}
                  <tr className="hover:bg-zinc-50/80 bg-emerald-50/30">
                    <td className="px-4 py-3 font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      Plant Truck Inward / Load (लोड)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`load-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center font-bold text-emerald-700 border-l border-zinc-200">
                          +{c.loadReceivedFull}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-600">
                          {c.loadReceivedEmpty}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 3: Deliveries / Outflow */}
                  <tr className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-semibold text-orange-850 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-orange-600" />
                      Dispatched / Delivered (वाटप तपशील)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`del-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center font-bold text-rose-600 border-l border-zinc-200">
                          -{c.deliveredQty}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-400">
                          —
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 4: New Connections & TV Out */}
                  <tr className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-semibold text-purple-900">
                      New Connections &amp; TV Out (NC / TV)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`nctv-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center font-bold text-purple-700 border-l border-zinc-200">
                          -{c.ncTvQty}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-400">
                          —
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 5: Empties Returned */}
                  <tr className="hover:bg-zinc-50/80 bg-blue-50/20">
                    <td className="px-4 py-3 font-semibold text-blue-900 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                      Empties Received / Deposited (जमा)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`ret-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center text-zinc-400 border-l border-zinc-200">
                          —
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700">
                          +{c.emptiesReceived}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 6: Computer Calculated Closing Stock */}
                  <tr className="bg-zinc-100/90 font-bold border-t-2 border-zinc-300">
                    <td className="px-4 py-3 font-bold text-zinc-900">
                      Computer Stock (सिस्टम शिल्लक)
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`comp-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center text-blue-900 border-l border-zinc-300 font-extrabold text-[13px]">
                          {c.closingFull}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-800 font-extrabold text-[13px]">
                          {c.closingEmpty}
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 7: Physical Stock Input */}
                  <tr className="bg-amber-50/40">
                    <td className="px-4 py-3 font-bold text-amber-900">
                      Physical Count (प्रत्यक्ष शिल्लक)
                    </td>
                    {categories.map((c) => {
                      const cur = physicalCounts[c.categoryKey] || { full: "", empty: "" };
                      return (
                        <Fragment key={`phys-${c.categoryKey}`}>
                          <td className="px-2 py-1.5 text-center border-l border-zinc-200">
                            <input
                              type="number"
                              min="0"
                              placeholder={String(c.closingFull)}
                              value={cur.full}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPhysicalCounts((prev) => ({
                                  ...prev,
                                  [c.categoryKey]: { ...(prev[c.categoryKey] || { empty: "" }), full: val },
                                }));
                              }}
                              className="w-16 px-1.5 py-1 text-center text-xs font-bold border border-amber-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder={String(c.closingEmpty)}
                              value={cur.empty}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPhysicalCounts((prev) => ({
                                  ...prev,
                                  [c.categoryKey]: { ...(prev[c.categoryKey] || { full: "" }), empty: val },
                                }));
                              }}
                              className="w-16 px-1.5 py-1 text-center text-xs font-bold border border-amber-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>

                  {/* Row 8: Difference / Shortage */}
                  <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                    <td className="px-4 py-3 font-semibold text-zinc-700">
                      Difference / Audit Variance (तफावत)
                    </td>
                    {categories.map((c) => {
                      const phys = physicalCounts[c.categoryKey];
                      const diffFull = phys?.full ? parseInt(phys.full, 10) - c.closingFull : 0;
                      const diffEmpty = phys?.empty ? parseInt(phys.empty, 10) - c.closingEmpty : 0;
                      return (
                        <Fragment key={`diff-${c.categoryKey}`}>
                          <td
                            className={`px-3 py-2 text-center border-l border-zinc-200 ${
                              diffFull < 0 ? "text-rose-600" : diffFull > 0 ? "text-emerald-600" : "text-zinc-400"
                            }`}
                          >
                            {diffFull > 0 ? `+${diffFull}` : diffFull}
                          </td>
                          <td
                            className={`px-3 py-2 text-center ${
                              diffEmpty < 0 ? "text-rose-600" : diffEmpty > 0 ? "text-emerald-600" : "text-zinc-400"
                            }`}
                          >
                            {diffEmpty > 0 ? `+${diffEmpty}` : diffEmpty}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>

                  {/* Row 9: Minimum Stock Limit (Set by Agency Owner) */}
                  <tr className="bg-blue-50/25 font-semibold border-t border-zinc-200">
                    <td className="px-4 py-2.5 text-zinc-700">
                      <div className="flex items-center justify-between">
                        <span>Min Stock Limit (किमान साठा मर्यादा)</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Reorder alert</span>
                      </div>
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`min-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center border-l border-zinc-200 font-bold text-blue-900">
                          {c.minStock !== undefined && c.minStock > 0 ? c.minStock : "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-400 text-[11px]">
                          —
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 10: Maximum Stock Limit (Set by Agency Owner) */}
                  <tr className="bg-blue-50/25 font-semibold">
                    <td className="px-4 py-2.5 text-zinc-700">
                      <div className="flex items-center justify-between">
                        <span>Max Stock Limit (कमाल साठा मर्यादा)</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Storage limit</span>
                      </div>
                    </td>
                    {categories.map((c) => (
                      <Fragment key={`max-${c.categoryKey}`}>
                        <td className="px-3 py-2 text-center border-l border-zinc-200 font-bold text-blue-900">
                          {c.maxStock !== undefined && c.maxStock > 0 ? c.maxStock : "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-400 text-[11px]">
                          —
                        </td>
                      </Fragment>
                    ))}
                  </tr>

                  {/* Row 11: Stock Health & Alert Status */}
                  <tr className="bg-zinc-50/90 font-bold border-t border-zinc-200">
                    <td className="px-4 py-2.5 text-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                        <span>Stock Health Status (साठा स्थिती)</span>
                      </div>
                    </td>
                    {categories.map((c) => {
                      const isLow = c.minStock !== undefined && c.minStock > 0 && c.closingFull < c.minStock;
                      const isOver = c.maxStock !== undefined && c.maxStock > 0 && c.closingFull > c.maxStock;
                      const hasLimits = (c.minStock && c.minStock > 0) || (c.maxStock && c.maxStock > 0);

                      return (
                        <td key={`status-${c.categoryKey}`} colSpan={2} className="px-2 py-2 text-center border-l border-zinc-200">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              LOW (कमी साठा)
                            </span>
                          ) : isOver ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              OVER (जास्त साठा)
                            </span>
                          ) : hasLimits ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              OPTIMAL (योग्य)
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF EMPTY CYLINDER TALLY LEDGER (SHEET 1 LEFT REPLICA) */}
      {activeTab === "staff" && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                Staff Empty Cylinder Credit/Debit Ledger (खाली सिलेंडर जमा बाकी)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tracks cylinders issued to each delivery boy vs. delivered and empties brought back.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            {staffBalances.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="text-xs font-bold text-zinc-700">No staff deliveries logged for {selectedDate}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Deliveries made via mobile field app or office entries will automatically reflect here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Staff Name (नाव)</th>
                    <th className="px-4 py-3 text-center">Morning Issued (फुल दिले)</th>
                    <th className="px-4 py-3 text-center">Delivered (वाटप)</th>
                    <th className="px-4 py-3 text-center">Empties Returned (जमा)</th>
                    <th className="px-4 py-3 text-center">Pending with Staff (बाकी)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {staffBalances.map((sb) => (
                    <tr key={sb.staffId} className="hover:bg-zinc-50 font-medium">
                      <td className="px-4 py-3 font-bold text-zinc-900">{sb.staffName}</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-700">
                        {sb.cylindersIssuedToday}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700">
                        {sb.cylindersDeliveredToday}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-800">
                        {sb.emptiesReturnedToday}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                            sb.pendingWithStaff > 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {sb.pendingWithStaff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sb.pendingWithStaff === 0 ? (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-semibold flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {sb.pendingWithStaff} Empties Due
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CASH DENOMINATIONS & GODOWN EXPENSES (SHEET 2 REPLICA) */}
      {activeTab === "cash" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Cash Notes Denomination Calculator */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Cash Denominations Tally (रोकड तक्ता)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Count of currency notes collected at closing</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Total: {formatCurrency(cashTotal)}
              </span>
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {[
                { label: "₹2,000 Notes", key: "n2000", multiplier: 2000 },
                { label: "₹500 Notes", key: "n500", multiplier: 500 },
                { label: "₹200 Notes", key: "n200", multiplier: 200 },
                { label: "₹100 Notes", key: "n100", multiplier: 100 },
                { label: "₹50 Notes", key: "n50", multiplier: 50 },
                { label: "₹20 Notes", key: "n20", multiplier: 20 },
                { label: "₹10 Notes", key: "n10", multiplier: 10 },
                { label: "Coins / चिल्लर", key: "coins", multiplier: 1 },
              ].map((note) => {
                const count = cashNotes[note.key] || 0;
                const lineTotal = count * note.multiplier;
                return (
                  <div key={note.key} className="py-2 flex items-center justify-between gap-3">
                    <span className="font-semibold text-zinc-700 w-28">{note.label}</span>
                    <span className="text-zinc-400">×</span>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? "" : count}
                      placeholder="0"
                      onChange={(e) => {
                        const val = parseInt(e.target.value || "0", 10);
                        setCashNotes((prev) => ({ ...prev, [note.key]: Math.max(0, val) }));
                      }}
                      className="w-24 text-center font-bold px-2 py-1 border border-zinc-200 rounded-lg text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-zinc-400">=</span>
                    <span className="font-mono font-bold text-zinc-900 w-24 text-right">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-900">Grand Total Cash (एकूण रोकड):</span>
              <span className="font-extrabold text-base text-emerald-700 font-mono">
                {formatCurrency(cashTotal)}
              </span>
            </div>
          </div>

          {/* Right: Daily Godown & Loading Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  Daily Godown &amp; Field Expenses (गोडाऊन खर्च)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Hamali truck loading/unloading, local tempo fuel, etc.</p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="text-xs font-bold text-zinc-700">No field expenses recorded for {selectedDate}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Logged expenses under Finance ➔ Expenses will display here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 text-xs">
                {expenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-900">{exp.description}</p>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        Category: {exp.category} · Logged by: {exp.addedByName}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      -{formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
                <div className="pt-3 flex items-center justify-between font-bold">
                  <span>Total Day Expenses:</span>
                  <span className="text-rose-700 font-mono text-sm">
                    {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY BOY CASH & UDHARI RECONCILIATION */}
      {activeTab === "delivery_udhari" && (
        <div className="space-y-6">
          {/* KPI Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Today's Cash Shortage</p>
                <p className="text-lg font-extrabold text-rose-600">{formatCurrency(totalShortageToday)}</p>
                <p className="text-[10px] text-zinc-400">एकूण रोख तूट</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Added to Delivery Udhari</p>
                <p className="text-lg font-extrabold text-amber-600">{formatCurrency(totalUdhariBooked)}</p>
                <p className="text-[10px] text-zinc-400">उधारी खात्यात जमा</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Staff Udhari Balance</p>
                <p className="text-lg font-extrabold text-purple-700">{formatCurrency(totalOutstandingUdhariSum)}</p>
                <p className="text-[10px] text-zinc-400">एकूण बाकी उधारी</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Closings</p>
                <p className="text-lg font-extrabold text-blue-700">
                  {deliveryBoyUdhariList.filter((d) => d.submissionStatus === "APPROVED").length} / {deliveryBoyUdhariList.length}
                </p>
                <p className="text-[10px] text-zinc-400">Approved by Admin</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Delivery Boy Cash Reconciliation &amp; Udhari Register (डिलिव्हरी बॉय रोख ताळमेळ व उधारी नोंद)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Tracks actual cash submitted to manager, automatically transfers shortages into delivery boy udhari, and records manager &amp; admin verification.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Delivery Boy</th>
                    <th className="px-4 py-3 text-center">Delivered / Empties</th>
                    <th className="px-4 py-3 text-right">Online / Cust. Udhari</th>
                    <th className="px-4 py-3 text-right">Expected Cash</th>
                    <th className="px-4 py-3 text-right font-black text-blue-700">Actual Cash Given</th>
                    <th className="px-4 py-3 text-right">Cash Shortage</th>
                    <th className="px-4 py-3 text-center">Shortage to Udhari</th>
                    <th className="px-4 py-3 text-right">Outstanding Udhari</th>
                    <th className="px-4 py-3 text-center">Verification Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {deliveryBoyUdhariList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-zinc-400">
                        No delivery boy closings submitted for this date yet.
                      </td>
                    </tr>
                  ) : (
                    deliveryBoyUdhariList.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-zinc-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                              {row.deliveryBoyName.charAt(0)}
                            </div>
                            <div>
                              <span>{row.deliveryBoyName}</span>
                              {row.deliveryBoyPhone && (
                                <span className="block text-[10px] text-zinc-400 font-normal">{row.deliveryBoyPhone}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-blue-600">{row.totalDelivered}</span>
                          <span className="text-zinc-400"> / </span>
                          <span className="font-bold text-emerald-600">{row.returnedQty}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500">
                          <div>Online: <span className="font-semibold text-purple-700">{formatCurrency(row.onlineAmount)}</span></div>
                          <div>Cust Udhari: <span className="font-semibold text-amber-700">{formatCurrency(row.customerUdhari)}</span></div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-zinc-700">
                          {formatCurrency(row.expectedCash)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-blue-700">
                          {formatCurrency(row.actualCashGiven)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.shortageAmount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                              -{formatCurrency(row.shortageAmount)}
                            </span>
                          ) : row.excessAmount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              +{formatCurrency(row.excessAmount)}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">Balanced</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.shortageAmount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <Receipt className="w-3 h-3 text-amber-600" />
                              Added to Udhari ({formatCurrency(row.shortageAmount)})
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-medium">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">
                          {formatCurrency(row.totalOutstandingUdhari)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {row.submissionStatus === "APPROVED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Confirmed by Admin
                              </span>
                            ) : row.submissionStatus === "VERIFIED_BY_MANAGER" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                2/3 Manager Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                1/3 Submitted by Boy
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PER-PRODUCT MOVEMENT HISTORY AUDIT */}
      {activeTab === "product_history" && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs space-y-5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Per-Product Movement Ledger (उत्पादन इतिहास व लेजर)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Inspect every addition (+) and deduction (-) for any cylinder or accessory product.
              </p>
            </div>

            {/* Product dropdown selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-zinc-600 whitespace-nowrap">Select Product:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full sm:w-64 text-xs font-semibold px-3 py-2 border border-zinc-300 rounded-xl bg-white text-zinc-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.isCylinder ? "🔥 Cylinder" : "📦 Accessory"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Stats Summary Pills */}
          {productStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Truck Loaded In</span>
                <span className="text-base font-extrabold text-blue-900">+{productStats.totalLoadedIn}</span>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Delivered to Customers</span>
                <span className="text-base font-extrabold text-emerald-900">-{productStats.totalDelivered}</span>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-purple-700 block">Counter OTC Sales</span>
                <span className="text-base font-extrabold text-purple-900">-{productStats.totalOfficeSales}</span>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Empties Returned</span>
                <span className="text-base font-extrabold text-amber-900">+{productStats.totalReturnedEmpties}</span>
              </div>
              <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Current Balance</span>
                <span className="text-base font-extrabold text-zinc-900">{productStats.currentNetBalance}</span>
              </div>
            </div>
          )}

          {/* Search bar inside history */}
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search movement type, customer, or note..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Chronological Movement Trail Table */}
          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            {historyLoading ? (
              <div className="py-12 text-center text-xs text-zinc-400">Loading product movement history...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">No stock movements found for this item.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-2.5">Date &amp; Time</th>
                    <th className="px-4 py-2.5">Movement Type</th>
                    <th className="px-4 py-2.5">Party / Route / Staff</th>
                    <th className="px-4 py-2.5 text-center">Change Qty</th>
                    <th className="px-4 py-2.5">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50 font-medium">
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(ev.timestamp).toLocaleDateString()} {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            ev.quantityChange > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : ev.quantityChange < 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-zinc-200 text-zinc-800"
                          }`}
                        >
                          {ev.typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-zinc-800">{ev.sourceOrParty}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            ev.quantityChange > 0
                              ? "text-emerald-700"
                              : ev.quantityChange < 0
                              ? "text-rose-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {ev.quantityChange > 0 ? `+${ev.quantityChange}` : ev.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 text-[11px]">{ev.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Stock Limits Configuration Modal (Agency Owner / Manager) */}
      {isLimitsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Set Agency Stock Limits (साठा मर्यादा सेटिंग्ज)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Agency Owner control: define Minimum safety stock and Maximum godown limit for each cylinder.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLimitsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Owner Policy Enforcement</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    <strong>Minimum Limit</strong> triggers low-stock alerts when stock drops below safety margins.
                    <strong>Maximum Limit</strong> prevents over-ordering and godown congestion.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {categories.map((c) => {
                  const currentLim = limitsForm[c.categoryKey] || { minStock: 0, maxStock: 0 };
                  const minVal = Number(currentLim.minStock) || 0;
                  const maxVal = Number(currentLim.maxStock) || 0;
                  const isLow = minVal > 0 && c.closingFull < minVal;
                  const isOver = maxVal > 0 && c.closingFull > maxVal;

                  return (
                    <div
                      key={`modal-${c.categoryKey}`}
                      className="p-3.5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">{c.label}</h4>
                          <span className="text-[11px] text-zinc-500">
                            Current Full Closing Stock: <strong className="text-zinc-800">{c.closingFull}</strong>
                          </span>
                        </div>
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ⚠️ Low Stock Risk
                          </span>
                        ) : isOver ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ Overstock Warning
                          </span>
                        ) : minVal > 0 || maxVal > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Within Normal Range
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                            Minimum Stock Limit (किमान साठा)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={currentLim.minStock}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setLimitsForm((prev) => ({
                                  ...prev,
                                  [c.categoryKey]: { ...(prev[c.categoryKey] || { maxStock: 0 }), minStock: val },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs font-bold border border-zinc-300 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g. 100"
                            />
                            <span className="absolute right-2.5 top-1.5 text-[10px] text-zinc-400 font-medium">cylinders</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">Alerts if stock drops below this</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                            Maximum Stock Limit (कमाल साठा)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={currentLim.maxStock}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setLimitsForm((prev) => ({
                                  ...prev,
                                  [c.categoryKey]: { ...(prev[c.categoryKey] || { minStock: 0 }), maxStock: val },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs font-bold border border-zinc-300 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g. 600"
                            />
                            <span className="absolute right-2.5 top-1.5 text-[10px] text-zinc-400 font-medium">cylinders</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">Alerts if storage exceeds this</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsLimitsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
              >
                Cancel (रद्द करा)
              </button>
              <button
                type="button"
                onClick={handleSaveStockLimits}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isPending ? "Saving Limits..." : "Save Stock Limits (मर्यादा जतन करा)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
