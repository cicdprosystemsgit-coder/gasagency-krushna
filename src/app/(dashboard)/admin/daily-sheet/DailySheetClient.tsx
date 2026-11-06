"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  FileSpreadsheet,
  Save,
  Printer,
  ChevronDown,
  ChevronUp,
  Clock,
  Navigation,
  Sparkles,
  Info,
  Calendar,
  PlusCircle,
  Users,
  Search,
  Phone,
  MapPin,
  AlertCircle,
  IndianRupee,
  CreditCard,
  User,
  Filter,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { DateNavigationHeader } from "@/components/ui/DateNavigationHeader";
import {
  saveDailySheet,
  type DailySheetData,
  type DeliveryBoyReconciliation,
  type CustomerPendingItem,
} from "@/app/actions/daily-sheet";

interface Props {
  initialData: DailySheetData;
  selectedDate: string;
  userRole?: string;
}

export function DailySheetClient({ initialData, selectedDate, userRole = "ADMIN" }: Props) {
  const router = useRouter();
  const [data, setData] = useState<DailySheetData>(initialData);
  const [activeTab, setActiveTab] = useState<"calculator" | "deliveryBoys" | "customerPending" | "notes">("calculator");
  const [notes, setNotes] = useState(initialData.notes || "");
  const [isPending, startTransition] = useTransition();

  // Tab 2: Delivery Boy Filter & Search States
  const [driverSearch, setDriverSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState<"ALL" | "SHORTAGE" | "PENDING_CUSTOMERS" | "BALANCED">("ALL");
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [viewCustomerMode, setViewCustomerMode] = useState<Record<string, "PENDING" | "ALL">>({});

  // Tab 3: Customer Pending Search
  const [customerSearch, setCustomerSearch] = useState("");

  const { summary, productRows, driverTrips, deliveryBoyReconciliations, allPendingCustomers } = data;

  const handleSaveSheet = () => {
    startTransition(async () => {
      const res = await saveDailySheet({
        date: selectedDate,
        notes,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Daily Sheet for ${selectedDate} saved successfully!`);
        setData((prev) => ({
          ...prev,
          status: "SAVED",
          notes,
          savedAt: new Date().toISOString(),
        }));
        router.refresh();
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered delivery boys for Tab 2
  const filteredDeliveryBoys = useMemo(() => {
    return (deliveryBoyReconciliations || []).filter((db) => {
      const matchesSearch =
        db.deliveryBoyName.toLowerCase().includes(driverSearch.toLowerCase()) ||
        db.vehicleNo.toLowerCase().includes(driverSearch.toLowerCase()) ||
        db.vehicleName.toLowerCase().includes(driverSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (driverFilter === "SHORTAGE") return db.totalShort > 0;
      if (driverFilter === "PENDING_CUSTOMERS") return db.totalCustomerPending > 0;
      if (driverFilter === "BALANCED") return db.totalShort === 0 && db.totalCustomerPending === 0;
      return true;
    });
  }, [deliveryBoyReconciliations, driverSearch, driverFilter]);

  // Filtered customers for Tab 3
  const filteredCustomers = useMemo(() => {
    return (allPendingCustomers || []).filter((c) => {
      return (
        c.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(customerSearch.toLowerCase())) ||
        c.phone.includes(customerSearch) ||
        c.productName.toLowerCase().includes(customerSearch.toLowerCase())
      );
    });
  }, [allPendingCustomers, customerSearch]);

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION & MULTI-TAB NAVIGATION BAR ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        {/* Multi-Tab Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-full sm:w-fit backdrop-blur-xs">
          {/* Tab 1: Calculator */}
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "calculator"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>1. Cylinder Calculator</span>
          </button>

          {/* Tab 2: Delivery Boys & Vehicles (Sheet 2) */}
          <button
            onClick={() => setActiveTab("deliveryBoys")}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "deliveryBoys"
                ? "bg-white text-emerald-600 shadow-xs border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>2. Delivery Boy Records</span>
            {deliveryBoyReconciliations && deliveryBoyReconciliations.length > 0 && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {deliveryBoyReconciliations.length}
              </span>
            )}
            {summary.totalBoyShortage > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                {summary.totalBoyShortage} Short
              </span>
            )}
          </button>

          {/* Tab 3: Customer Pending Empties */}
          <button
            onClick={() => setActiveTab("customerPending")}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "customerPending"
                ? "bg-white text-amber-600 shadow-xs border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Customer Pending</span>
            {allPendingCustomers && allPendingCustomers.length > 0 && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {allPendingCustomers.length}
              </span>
            )}
          </button>

          {/* Tab 4: Audit & Closing Notes */}
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "notes"
                ? "bg-white text-purple-600 shadow-xs border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>4. Closing &amp; Notes</span>
          </button>

          {/* Extensibility Tag: Ready for future tabs */}
          <div
            title="Modular architecture: New customer tabs can be added here"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 border border-dashed border-slate-200"
          >
            <PlusCircle className="w-3 h-3" />
            <span>+ Custom Tab</span>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date:</span>
            <DateNavigationHeader selectedDate={selectedDate} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="btn btn-secondary text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleSaveSheet}
              disabled={isPending}
              type="button"
              className="btn btn-primary text-xs font-bold py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isPending ? "Saving..." : "Save Sheet"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── HIGH-LEVEL METRICS STRIP ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Allocated */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Allocated</p>
            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-700">{summary.totalAllocated}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Loaded on vehicles</p>
        </div>

        {/* Delivered */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivered</p>
            <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-700">{summary.totalDelivered}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Given to customers</p>
        </div>

        {/* Empty Return */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Empty Return</p>
            <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RotateCcw className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-indigo-700">{summary.totalEmptyReturned}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Empties at godown</p>
        </div>

        {/* Full Return (Unsold) */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Return</p>
            <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-amber-700">{summary.totalFullReturned}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Unsold full cylinders</p>
        </div>

        {/* Customer Pending Empties */}
        <div className="rounded-xl p-3.5 bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Pending</p>
            <div className="w-5 h-5 rounded bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-orange-700">{summary.totalCustomerPending || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting empty return</p>
        </div>

        {/* Discrepancy / Boy Shortage */}
        <div
          className={`rounded-xl p-3.5 border shadow-2xs ${
            summary.totalShort > 0
              ? "bg-red-50/50 border-red-200"
              : summary.totalShort < 0
              ? "bg-purple-50/50 border-purple-200"
              : "bg-emerald-50/50 border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Shortage / Balance</p>
            <div
              className={`w-5 h-5 rounded flex items-center justify-center ${
                summary.totalShort > 0
                  ? "bg-red-100 text-red-600"
                  : summary.totalShort < 0
                  ? "bg-purple-100 text-purple-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {summary.totalShort > 0 ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
            </div>
          </div>
          <p
            className={`text-xl font-extrabold ${
              summary.totalShort > 0
                ? "text-red-600"
                : summary.totalShort < 0
                ? "text-purple-600"
                : "text-emerald-600"
            }`}
          >
            {summary.totalShort > 0 ? `-${summary.totalShort} Short` : summary.totalShort < 0 ? `+${Math.abs(summary.totalShort)} Excess` : "0 Balanced"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {summary.totalShort > 0 ? "Pending with boys" : "Math fully matched"}
          </p>
        </div>
      </div>

      {/* ── TAB 1: MASTER 5-COLUMN PRODUCT CALCULATOR ────────────────────────── */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Master Cylinder Delivery &amp; Empty Return Calculator</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time formula: <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[11px]">Total = Empty Return + Full Return</code> and <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[11px]">Short = Allocated - Total</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge badge-neutral text-xs font-semibold">
                  Date: {selectedDate}
                </span>
                <span
                  className={`badge text-xs font-bold ${
                    summary.totalShort === 0
                      ? "badge-approved text-emerald-800 bg-emerald-100"
                      : "badge-pending text-red-800 bg-red-100"
                  }`}
                >
                  {summary.totalShort === 0 ? "✓ Sheet Balanced" : `⚠ ${summary.totalShort} Cylinder Short`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Cylinder Product</th>
                    <th className="py-3 px-4 text-center bg-blue-50/40 text-blue-900 border-x border-slate-200/60">
                      Allocated (Loaded)
                    </th>
                    <th className="py-3 px-4 text-center">1. Delivered</th>
                    <th className="py-3 px-4 text-center">2. Empty Return</th>
                    <th className="py-3 px-4 text-center">3. Full Return</th>
                    <th className="py-3 px-4 text-center bg-indigo-50/40 text-indigo-900 border-x border-slate-200/60">
                      4. Total (Accounted)
                    </th>
                    <th className="py-3 px-4 text-center">5. Short (Difference)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {productRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No cylinders allocated for this date</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Assign cylinders to delivery vehicles in Godown &amp; Fleet to calculate daily sheets.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    productRows.map((row) => (
                      <tr
                        key={row.productId}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          row.shortQty > 0 ? "bg-red-50/30" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{row.productName}</p>
                          <p className="text-[10px] text-slate-400">
                            {row.isCylinder ? "LPG Cylinder" : "General Product"}
                          </p>
                        </td>

                        {/* Allocated */}
                        <td className="py-3.5 px-4 text-center font-extrabold text-blue-700 bg-blue-50/30 border-x border-slate-100 text-[13px]">
                          {row.allocatedQty}
                        </td>

                        {/* Col 1: Delivered */}
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700 text-[13px]">
                          {row.deliveredQty}
                        </td>

                        {/* Col 2: Empty Return */}
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-700 text-[13px]">
                          {row.emptyReturnQty}
                        </td>

                        {/* Col 3: Full Return */}
                        <td className="py-3.5 px-4 text-center font-bold text-amber-700 text-[13px]">
                          {row.fullReturnQty}
                        </td>

                        {/* Col 4: Total Accounted */}
                        <td className="py-3.5 px-4 text-center font-extrabold text-indigo-900 bg-indigo-50/30 border-x border-slate-100 text-[13px]">
                          {row.totalAccountedQty}
                        </td>

                        {/* Col 5: Short */}
                        <td className="py-3.5 px-4 text-center font-extrabold text-[13px]">
                          {row.shortQty > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full font-bold">
                              -{row.shortQty} Short
                            </span>
                          ) : row.shortQty < 0 ? (
                            <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-100 px-2.5 py-0.5 rounded-full font-bold">
                              +{Math.abs(row.shortQty)} Excess
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                              0 Balanced
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {row.status === "BALANCED" ? (
                            <span className="badge badge-approved text-[10px] font-bold">Matched</span>
                          ) : row.status === "SHORT" ? (
                            <span className="badge badge-pending text-[10px] font-bold text-red-700 bg-red-100 border-red-200">
                              Missing Addition
                            </span>
                          ) : (
                            <span className="badge badge-neutral text-[10px] font-bold text-purple-700 bg-purple-100">
                              Surplus Return
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer Totals */}
                {productRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-xs text-slate-800">
                      <td className="py-3.5 px-4 uppercase tracking-wider">Total Sum</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-blue-700 border-x border-slate-200 text-sm">
                        {summary.totalAllocated}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700 text-sm">
                        {summary.totalDelivered}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-indigo-700 text-sm">
                        {summary.totalEmptyReturned}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 text-sm">
                        {summary.totalFullReturned}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-indigo-900 border-x border-slate-200 text-sm">
                        {summary.totalAccounted}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm">
                        {summary.totalShort > 0 ? (
                          <span className="text-red-700 font-extrabold">-{summary.totalShort} Short</span>
                        ) : summary.totalShort < 0 ? (
                          <span className="text-purple-700 font-extrabold">+{Math.abs(summary.totalShort)} Excess</span>
                        ) : (
                          <span className="text-emerald-700 font-extrabold">0 Balanced</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] text-slate-500 font-bold">100% Calculated</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DELIVERY BOY & VEHICLE RECONCILIATION (SHEET 2) ─────────────── */}
      {activeTab === "deliveryBoys" && (
        <div className="space-y-5">
          {/* Controls Bar: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                placeholder="Search delivery boy name, vehicle number..."
                className="input w-full pl-9 pr-4 py-2 text-xs rounded-lg border-slate-200 focus:border-emerald-500"
              />
              {driverSearch && (
                <button
                  onClick={() => setDriverSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                onClick={() => setDriverFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  driverFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({deliveryBoyReconciliations.length})
              </button>
              <button
                onClick={() => setDriverFilter("SHORTAGE")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  driverFilter === "SHORTAGE"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                <span>Shortage / Pending</span>
                {summary.totalBoyShortage > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setDriverFilter("PENDING_CUSTOMERS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  driverFilter === "PENDING_CUSTOMERS"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Pending Customers ({summary.totalCustomerPending || 0})
              </button>
              <button
                onClick={() => setDriverFilter("BALANCED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  driverFilter === "BALANCED"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Balanced
              </button>
            </div>
          </div>

          {/* Real-time sync banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">
                Live Synchronization: Connected directly to Godown Vehicle Departure/Return &amp; Delivery Boy Mobile Submissions.
              </span>
            </div>
            <span className="text-[11px] font-mono text-blue-700">Auto-updating</span>
          </div>

          {/* List of Delivery Boy Reconciliation Cards */}
          {filteredDeliveryBoys.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white">
              <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">No delivery boy records found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No delivery boy activity matches the selected filter for {selectedDate}. Assign vehicles in Godown or record deliveries in the Delivery Boy portal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliveryBoys.map((boy) => {
                const isExpanded = expandedDriverId === boy.deliveryBoyId;
                const isShort = boy.totalShort > 0;
                const isExcess = boy.totalShort < 0;
                const isBalanced = boy.totalShort === 0;
                const customerMode = viewCustomerMode[boy.deliveryBoyId] || "PENDING";
                const shownCustomers =
                  customerMode === "PENDING" ? boy.pendingCustomers : boy.customerDeliveries;

                return (
                  <div
                    key={boy.deliveryBoyId}
                    className={`rounded-2xl border transition-all duration-200 bg-white shadow-2xs overflow-hidden ${
                      isShort ? "border-red-300 ring-1 ring-red-200" : "border-slate-200/80"
                    }`}
                  >
                    {/* Card Header Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Driver & Vehicle Identity */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            isShort ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                              {boy.deliveryBoyName}
                            </h4>
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {boy.vehicleNo}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({boy.vehicleName} • {boy.vehicleType})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                boy.tripStatus === "RETURNED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : boy.tripStatus === "PARTIAL_RETURN"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : boy.tripStatus === "LOADED" || boy.tripStatus === "OUT_FOR_DELIVERY"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {boy.tripStatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            {boy.deliveryBoyPhone && (
                              <a
                                href={`tel:${boy.deliveryBoyPhone}`}
                                className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{boy.deliveryBoyPhone}</span>
                              </a>
                            )}
                            {boy.departureTime && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  Out: {new Date(boy.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </span>
                            )}
                            {boy.returnTime && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <RotateCcw className="w-3 h-3 text-slate-400" />
                                <span>
                                  In: {new Date(boy.returnTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Quick Status Badges & Toggle */}
                      <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 flex-wrap">
                        {/* Shortage Flag */}
                        {isShort ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100/90 text-red-800 border border-red-200">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <div className="text-left">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                                Short / Pending Cylinder
                              </p>
                              <p className="text-xs font-extrabold">
                                {boy.totalShort} Cylinder{boy.totalShort !== 1 ? "s" : ""} Added to Boy Pending
                              </p>
                            </div>
                          </div>
                        ) : isExcess ? (
                          <div className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 text-left">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Surplus Return</p>
                            <p className="text-xs font-extrabold">+{Math.abs(boy.totalShort)} Cylinders Excess</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="text-left">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Reconciliation</p>
                              <p className="text-xs font-extrabold">100% Balanced (0 Short)</p>
                            </div>
                          </div>
                        )}

                        {/* Customer Pending Badge */}
                        {boy.totalCustomerPending > 0 && (
                          <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-left">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Pending Customers</p>
                            <p className="text-xs font-extrabold">{boy.totalCustomerPending} Empties Due</p>
                          </div>
                        )}

                        {/* Expand Button */}
                        <button
                          onClick={() => setExpandedDriverId(isExpanded ? null : boy.deliveryBoyId)}
                          className="btn btn-secondary text-xs font-bold py-1.5 px-3 flex items-center gap-1 shadow-2xs"
                        >
                          <span>{isExpanded ? "Collapse Details" : "View Breakdown"}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Quick Metric Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/40 text-center text-xs">
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">1. Assigned (Loaded)</p>
                        <p className="text-base font-extrabold text-blue-700">{boy.totalLoaded}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">2. Delivered</p>
                        <p className="text-base font-extrabold text-emerald-700">{boy.totalDelivered}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">3. Full Return</p>
                        <p className="text-base font-extrabold text-amber-700">{boy.totalFullReturned}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">4. Empty Return</p>
                        <p className="text-base font-extrabold text-indigo-700">{boy.totalEmptyReturned}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">5. Pending Customer</p>
                        <p className="text-base font-extrabold text-orange-700">{boy.totalCustomerPending}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">6. Delivery Boy Short</p>
                        <p
                          className={`text-base font-extrabold ${
                            isShort ? "text-red-600" : isBalanced ? "text-emerald-600" : "text-purple-600"
                          }`}
                        >
                          {isShort ? `-${boy.totalShort}` : isBalanced ? "0" : `+${Math.abs(boy.totalShort)}`}
                        </p>
                      </div>
                    </div>

                    {/* Cash & Credit Collection Ribbon */}
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 font-semibold">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cash Collected:</span>
                          <strong className="text-emerald-700">₹{boy.totalCashCollected.toLocaleString()}</strong>
                        </span>
                        {boy.totalCreditAmount > 0 && (
                          <span className="flex items-center gap-1 font-semibold">
                            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                            <span>Credit (Udhari):</span>
                            <strong className="text-amber-700">₹{boy.totalCreditAmount.toLocaleString()}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {boy.customerDeliveries.length} Customer deliveries recorded today
                      </span>
                    </div>

                    {/* Expandable Breakdown Sections */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-6 border-t border-slate-200 bg-slate-50/30">
                        {/* ── Section A: Assigned Products & Quantities Matrix ── */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                              <span>Product-wise Allocation &amp; Return Calculator for {boy.deliveryBoyName}</span>
                            </h5>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Matched = (Full Return + Empty Return + Customer Pending)
                            </span>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <th className="py-2.5 px-3.5">Product Type</th>
                                  <th className="py-2.5 px-3 text-center bg-blue-50/50 text-blue-900 border-x border-slate-200/60">
                                    Assigned (Loaded)
                                  </th>
                                  <th className="py-2.5 px-3 text-center">Delivered</th>
                                  <th className="py-2.5 px-3 text-center">Full Return (Unsold)</th>
                                  <th className="py-2.5 px-3 text-center">Empty Return</th>
                                  <th className="py-2.5 px-3 text-center bg-amber-50/50 text-amber-900 border-x border-slate-200/60">
                                    Customer Pending
                                  </th>
                                  <th className="py-2.5 px-3 text-center bg-indigo-50/50 text-indigo-900 border-r border-slate-200/60">
                                    Total Accounted
                                  </th>
                                  <th className="py-2.5 px-3 text-center">Shortage (Boy Pending)</th>
                                  <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {boy.products.length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="py-6 text-center text-slate-400">
                                      No products assigned or recorded for this driver today.
                                    </td>
                                  </tr>
                                ) : (
                                  boy.products.map((p) => (
                                    <tr key={p.productId} className={`hover:bg-slate-50/50 ${p.shortQty > 0 ? "bg-red-50/30" : ""}`}>
                                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{p.productName}</td>
                                      <td className="py-2.5 px-3 text-center font-extrabold text-blue-700 bg-blue-50/30 border-x border-slate-100">
                                        {p.loadedQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                        {p.deliveredQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                                        {p.fullReturnQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                                        {p.emptyReturnQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-orange-700 bg-amber-50/30 border-x border-slate-100">
                                        {p.customerPendingQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-extrabold text-indigo-900 bg-indigo-50/30 border-r border-slate-100">
                                        {p.totalAccountedQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-extrabold">
                                        {p.shortQty > 0 ? (
                                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                            -{p.shortQty} Short (Added)
                                          </span>
                                        ) : p.shortQty < 0 ? (
                                          <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                            +{Math.abs(p.shortQty)} Excess
                                          </span>
                                        ) : (
                                          <span className="text-emerald-600 font-bold">✓ Matched</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {p.status === "BALANCED" ? (
                                          <span className="badge badge-approved text-[10px] font-bold">Balanced</span>
                                        ) : p.status === "SHORT" ? (
                                          <span className="badge badge-pending text-[10px] font-bold text-red-700 bg-red-100">
                                            Pending with Boy
                                          </span>
                                        ) : (
                                          <span className="badge badge-neutral text-[10px] font-bold text-purple-700 bg-purple-100">
                                            Surplus
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ── Section B: Real-Time Customer Pending Empty Cylinders ── */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-600" />
                                <span>Customer Deliveries &amp; Pending Cylinders for {boy.deliveryBoyName}</span>
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                Real-time customer records where empty cylinder was not collected during delivery
                              </p>
                            </div>

                            {/* Toggle: Pending vs All Deliveries */}
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 border border-slate-300/60 text-xs">
                              <button
                                onClick={() =>
                                  setViewCustomerMode((prev) => ({ ...prev, [boy.deliveryBoyId]: "PENDING" }))
                                }
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                  customerMode === "PENDING"
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Pending Empties ({boy.pendingCustomers.length})
                              </button>
                              <button
                                onClick={() =>
                                  setViewCustomerMode((prev) => ({ ...prev, [boy.deliveryBoyId]: "ALL" }))
                                }
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                  customerMode === "ALL"
                                    ? "bg-white text-blue-700 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                All Deliveries ({boy.customerDeliveries.length})
                              </button>
                            </div>
                          </div>

                          {/* Customer Deliveries Table */}
                          {shownCustomers.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-white">
                              {customerMode === "PENDING" ? (
                                <div className="space-y-1">
                                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                                  <p className="text-xs font-bold text-slate-700">No pending cylinders with customers!</p>
                                  <p className="text-[11px] text-slate-400">
                                    Every customer delivered by {boy.deliveryBoyName} today returned their empty cylinder.
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">No customer deliveries recorded for this driver yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-2.5 px-3">Customer Name</th>
                                    <th className="py-2.5 px-3">Contact &amp; Address</th>
                                    <th className="py-2.5 px-3">Product</th>
                                    <th className="py-2.5 px-3 text-center">Delivered Full</th>
                                    <th className="py-2.5 px-3 text-center">Empty Given</th>
                                    <th className="py-2.5 px-3 text-center bg-amber-50 text-amber-900 font-extrabold border-x border-slate-200/60">
                                      Pending Empty
                                    </th>
                                    <th className="py-2.5 px-3">Payment</th>
                                    <th className="py-2.5 px-3">Time &amp; Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {shownCustomers.map((c) => (
                                    <tr
                                      key={c.id}
                                      className={`hover:bg-slate-50/60 ${
                                        c.pendingEmptyQty > 0 ? "bg-amber-50/20" : ""
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                                        <p>{c.customerName}</p>
                                        {c.customerCode && (
                                          <p className="text-[10px] font-mono text-slate-400">{c.customerCode}</p>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        {c.phone && c.phone !== "-" ? (
                                          <a
                                            href={`tel:${c.phone}`}
                                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                          >
                                            <Phone className="w-3 h-3" />
                                            <span>{c.phone}</span>
                                          </a>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                        {c.address && (
                                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                            {c.address}
                                          </p>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-medium text-slate-700">{c.productName}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                        {c.deliveredQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                                        {c.returnedQty}
                                      </td>
                                      <td className="py-2.5 px-3 text-center bg-amber-50/30 border-x border-slate-100">
                                        {c.pendingEmptyQty > 0 ? (
                                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-extrabold text-[11px]">
                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                            <span>{c.pendingEmptyQty} Empty Due</span>
                                          </span>
                                        ) : (
                                          <span className="text-emerald-600 font-bold text-[11px]">✓ Received</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="font-semibold text-slate-800">
                                          {c.paymentMode} {c.cashCollected > 0 && `₹${c.cashCollected}`}
                                        </span>
                                        {c.creditAmount > 0 && (
                                          <p className="text-[10px] font-bold text-amber-600">
                                            Credit: ₹{c.creditAmount}
                                          </p>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-500">
                                        <p className="text-[10px] font-mono">{c.time}</p>
                                        {c.notes && (
                                          <p className="text-[10px] text-slate-600 italic truncate max-w-[140px]">
                                            {c.notes}
                                          </p>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CUSTOMER PENDING EMPTIES MASTER REGISTER ──────────────────── */}
      {activeTab === "customerPending" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Master Customer Pending Cylinders Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete agency list of customers who received gas cylinders today but have not yet returned their empty cylinder
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer name, code, phone..."
                  className="input w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>

            {/* Total Empties Banner */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{allPendingCustomers.length} Customers</strong> currently owe empty cylinders from today's deliveries ({selectedDate}).
                </span>
              </div>
              <span className="font-extrabold text-amber-800 text-sm">
                Total Due: {summary.totalCustomerPending || 0} Cylinders
              </span>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Cylinder Product</th>
                    <th className="py-3 px-4 text-center">Delivered Qty</th>
                    <th className="py-3 px-4 text-center">Empty Returned</th>
                    <th className="py-3 px-4 text-center bg-amber-50 text-amber-900 font-extrabold border-x border-slate-200">
                      Pending Empty
                    </th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Time &amp; Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                        <p className="font-semibold text-slate-600">No pending empty cylinders found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          All customers delivered today returned their empty cylinders successfully.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 bg-amber-50/10">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <p>{c.customerName}</p>
                          {c.customerCode && (
                            <span className="font-mono text-[10px] text-slate-400 font-medium">
                              Code: {c.customerCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.phone && c.phone !== "-" ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                          {c.address || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{c.productName}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{c.deliveredQty}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-700">{c.returnedQty}</td>
                        <td className="py-3 px-4 text-center bg-amber-50/40 border-x border-slate-200">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{c.pendingEmptyQty} Empty Due</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          <p>{c.paymentMode}</p>
                          {c.cashCollected > 0 && <p className="text-slate-500 font-normal">Cash: ₹{c.cashCollected}</p>}
                          {c.creditAmount > 0 && (
                            <p className="text-amber-600 font-bold text-[11px]">Udhari: ₹{c.creditAmount}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <p className="font-mono text-[11px]">{c.time}</p>
                          {c.notes && <p className="text-[10px] text-slate-600 italic truncate max-w-[160px]">{c.notes}</p>}
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

      {/* ── TAB 4: CLOSING NOTES & AUDIT ─────────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Closing Remarks &amp; Audit</h3>
              <p className="text-xs text-slate-500">
                Record end-of-day supervisor observations, driver shortage explanations, or physical godown tally notes.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Supervisor Remarks for {selectedDate}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Enter daily closing remarks, driver shortage explanations, or physical tally notes..."
                className="input w-full text-xs resize-none p-3 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {data.savedAt ? `Last saved on ${new Date(data.savedAt).toLocaleString()}` : "Sheet not locked yet"}
              </span>
              <button
                type="button"
                onClick={handleSaveSheet}
                disabled={isPending}
                className="btn btn-primary text-xs font-bold py-2 px-5 flex items-center gap-2 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isPending ? "Saving..." : "Lock & Save Daily Sheet"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
