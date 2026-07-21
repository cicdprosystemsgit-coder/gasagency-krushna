"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { SelectWithAdd, type SelectOption } from "@/components/ui/SelectWithAdd";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, Receipt, Trash2, Search, CheckCircle2, XCircle, User,
  Building2, Phone, MapPin, Hash, Check, RotateCcw, AlertCircle, Clock, Calendar,
  PackageX, Sparkles, ShoppingBag, Landmark, ArrowRight, ArrowLeft, Filter, X, CalendarDays, Wallet
} from "lucide-react";
import { createOfficeTransaction, deleteOfficeTransaction, verifyRegulatorNumber } from "@/app/actions/office-transactions";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import type { Product } from "@/generated/prisma";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: Date | string;
  type: string;
  description: string | null;
  qty: number;
  unitRate: number;
  amount: number;
  paymentMode: string;
  remarks: string | null;
  product: { name: string } | null;
  addedBy: { name: string };
  customer?: { name: string; phone: string } | null;
  createdAt: Date | string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  type: "DOMESTIC" | "COMMERCIAL";
  customerCode: string | null;
  contactPerson: string | null;
  businessType: string | null;
}

interface OfficeTransactionsClientProps {
  initialTransactions: Transaction[];
  products: Product[];
  stockMap?: Record<string, { officeStock: number; godownStock: number }>;
  customers: CustomerRecord[];
  userId: string;
  canEdit: boolean;
}

const getPaymentModeDisplay = (mode: string) => {
  if (mode === "CASH") return "Cash";
  if (mode === "ONLINE") return "Online";
  if (mode === "CREDIT") return "Credit";
  return mode;
};

const TABS = ["Inventory", "Cylinder / Gas New Connection"] as const;

const INVENTORY_TYPE_OPTIONS: SelectOption[] = [
  { value: "OTHER",             label: "Other Inventory" },
  { value: "REGULATOR",         label: "Regulator — New Issue" },
  { value: "REGULATOR_REPLACE", label: "Regulator — Replacement" },
  { value: "PIPE",              label: "Pipe Fitting" },
];

const CYLINDER_TYPE_OPTIONS: SelectOption[] = [
  { value: "NEW_CONNECTION",  label: "New Connection (NC)" },
  { value: "CYLINDER_REFILL", label: "Cylinder Refill" },
];

// Step Indicator Component
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Select Customer", "Transaction Details", "Confirm & Review"];
  return (
    <div className="flex items-center gap-0 mb-6 px-1">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                    ? "bg-blue-600 text-white ring-4 ring-blue-50"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold whitespace-nowrap",
                  active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"
                )}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-2 mb-4 transition-all duration-300",
                  step > num ? "bg-emerald-500" : "bg-slate-150"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Customer Card Component
function CustomerCard({ c, selected, onClick }: { c: CustomerRecord; selected?: boolean; onClick?: () => void }) {
  const isDomestic = c.type === "DOMESTIC";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-3.5 transition-all duration-200 border",
        selected
          ? "border-blue-600 bg-blue-50/50 shadow-sm"
          : "border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm",
            isDomestic ? "bg-blue-600" : "bg-purple-600"
          )}
        >
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-[14px]">{c.name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs",
                isDomestic
                  ? "bg-blue-100/70 text-blue-700"
                  : "bg-purple-100/70 text-purple-700"
              )}
            >
              {isDomestic ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
              {isDomestic ? "Regular" : "Commercial"}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Phone className="w-3 h-3" /> {c.phone}
            </span>
            {c.customerCode && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-blue-600 font-semibold">
                <Hash className="w-3 h-3" /> {c.customerCode}
              </span>
            )}
          </div>
          {c.address && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{c.address}</span>
            </div>
          )}
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-blue-600" />}
      </div>
    </button>
  );
}

const getLocalDateTimeStrings = () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { dateStr, timeStr };
};

export function OfficeTransactionsClient({
  initialTransactions,
  products,
  stockMap = {},
  customers = [],
  userId,
  canEdit = true,
}: OfficeTransactionsClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Inventory");
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterPayment, setFilterPayment] = useState("ALL");
  const [dateScope, setDateScope] = useState<"SINGLE" | "ALL">("SINGLE");
  const [otherPaymentApp, setOtherPaymentApp] = useState("");
  const [inventoryTypeOptions, setInventoryTypeOptions] = useState<SelectOption[]>(INVENTORY_TYPE_OPTIONS);
  const [cylinderTypeOptions, setCylinderTypeOptions] = useState<SelectOption[]>(CYLINDER_TYPE_OPTIONS);
  
  // Wizard States
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  
  // Customer Search States
  const [searchMode, setSearchMode] = useState<"conn" | "name">("name");
  const [connNo, setConnNo] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const connInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => {
    const { dateStr, timeStr } = getLocalDateTimeStrings();
    return {
      type: "OTHER",
      inventoryId: "",
      description: "",
      qty: "1",
      unitRate: "",
      paymentMode: "CASH",
      remarks: "",
      regulatorNo: "",
      oldRegulatorNo: "",
      newRegulatorNo: "",
      txnDate: dateStr,
      txnTime: timeStr,
    };
  });

  const [regulatorCheckLoading, setRegulatorCheckLoading] = useState(false);
  const [oldRegulatorRecord, setOldRegulatorRecord] = useState<any | null>(null);
  const [oldRegulatorError, setOldRegulatorError] = useState<string | null>(null);

  const handleVerifyOldRegulator = async (val?: string) => {
    const targetNo = (val ?? form.oldRegulatorNo).trim();
    if (!targetNo) return;
    setRegulatorCheckLoading(true);
    setOldRegulatorError(null);
    setOldRegulatorRecord(null);

    const res = await verifyRegulatorNumber(targetNo);
    setRegulatorCheckLoading(false);

    if (res.error) {
      setOldRegulatorError(res.error);
    } else if (res.record) {
      setOldRegulatorRecord(res.record);
      if (res.record.customer && !selectedCustomer) {
        const found = customers.find((c) => c.id === res.record.customerId);
        if (found) setSelectedCustomer(found);
      }
    }
  };

  useEffect(() => {
    if (modalOpen) {
      if (searchMode === "name") {
        nameInputRef.current?.focus();
      } else {
        connInputRef.current?.focus();
      }
    }
  }, [modalOpen, searchMode]);

  useEffect(() => {
    if (selectedCustomer?.type !== "COMMERCIAL" && form.paymentMode === "CREDIT") {
      setForm((prev) => ({ ...prev, paymentMode: "CASH" }));
    }
  }, [selectedCustomer, form.paymentMode]);

  // Filtered Customer Search
  const connResults = connNo.trim()
    ? customers.filter((c) =>
        c.customerCode?.toLowerCase().includes(connNo.trim().toLowerCase())
      )
    : [];

  const nameResults = nameQuery.trim().length >= 2
    ? customers.filter((c) => {
        const q = nameQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.customerCode?.toLowerCase().includes(q) ||
          (c.contactPerson ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 5)
    : [];

  // Build a unified type map from both option lists for display in the table
  const typeMap: Record<string, string> = Object.fromEntries(
    [...inventoryTypeOptions, ...cylinderTypeOptions].map((o) => [o.value, o.label])
  );

  const filteredTxns = transactions.filter((t) => {
    // 1. Tab Match
    const tabMatch = activeTab === "Inventory"
      ? ["OTHER", "REGULATOR", "REGULATOR_REPLACE", "PIPE"].includes(t.type)
      : ["NEW_CONNECTION", "CYLINDER_REFILL"].includes(t.type);
    if (!tabMatch) return false;

    // 2. Date Scope Match
    if (dateScope === "SINGLE") {
      const dateMatch = new Date(t.date).toDateString() === new Date(selectedDate).toDateString();
      if (!dateMatch) return false;
    }

    // 3. Subtype Filter Match
    if (filterType !== "ALL" && t.type !== filterType) {
      return false;
    }

    // 4. Payment Mode Filter Match
    if (filterPayment !== "ALL") {
      if (filterPayment === "ONLINE") {
        if (["CASH", "CREDIT"].includes(t.paymentMode)) return false;
      } else if (t.paymentMode !== filterPayment) {
        return false;
      }
    }

    // 5. Search Query Match
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      const matchCustName = t.customer?.name?.toLowerCase().includes(q) ?? false;
      const matchCustPhone = t.customer?.phone?.includes(q) ?? false;
      const matchProd = t.product?.name?.toLowerCase().includes(q) ?? false;
      const matchDesc = t.description?.toLowerCase().includes(q) ?? false;
      const matchRemarks = t.remarks?.toLowerCase().includes(q) ?? false;
      const matchTypeLabel = (typeMap[t.type] ?? t.type).toLowerCase().includes(q);
      const matchPayment = t.paymentMode.toLowerCase().includes(q);
      if (!matchCustName && !matchCustPhone && !matchProd && !matchDesc && !matchRemarks && !matchTypeLabel && !matchPayment) {
        return false;
      }
    }

    return true;
  });

  // Derive stock info for the currently selected product
  const selectedProductStock = form.inventoryId ? (stockMap[form.inventoryId] ?? null) : null;
  const requestedQty = Number(form.qty) || 1;
  const isOverStock = selectedProductStock !== null && requestedQty > selectedProductStock.officeStock;

  const handleProductChange = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    setForm((prev) => ({
      ...prev,
      inventoryId: prodId,
      unitRate: prod ? String(prod.saleRate) : "",
    }));
  };

  const handleOpenAddModal = () => {
    setError("");
    setStep(1);
    setSelectedCustomer(null);
    setConnNo("");
    setNameQuery("");
    const { dateStr, timeStr } = getLocalDateTimeStrings();
    setForm({
      type: activeTab === "Inventory" ? "OTHER" : "NEW_CONNECTION",
      inventoryId: "",
      description: "",
      qty: "1",
      unitRate: "",
      paymentMode: "CASH",
      remarks: "",
      regulatorNo: "",
      oldRegulatorNo: "",
      newRegulatorNo: "",
      txnDate: dateStr,
      txnTime: timeStr,
    });
    setOtherPaymentApp("");
    setOldRegulatorRecord(null);
    setOldRegulatorError(null);
    setModalOpen(true);
  };

  function handleSubmit() {
    if (!form.unitRate || Number(form.unitRate) <= 0) {
      setError("Rate is required");
      return;
    }

    if (form.type === "REGULATOR" || form.type === "REGULATOR_REPLACE") {
      if (!selectedCustomer) {
        setError("Customer selection is mandatory for Regulator transactions.");
        return;
      }
    }

    if (form.type === "REGULATOR" && !form.regulatorNo.trim()) {
      setError("Regulator Serial Number is required.");
      return;
    }

    if (form.type === "REGULATOR_REPLACE") {
      if (!form.oldRegulatorNo.trim()) {
        setError("Returned (Old) Regulator Serial Number is required.");
        return;
      }
      if (!form.newRegulatorNo.trim()) {
        setError("New Regulator Serial Number is required.");
        return;
      }
    }

    const finalPaymentMode = form.paymentMode === "Others" ? otherPaymentApp.trim() : form.paymentMode;
    if (form.paymentMode === "Others" && !otherPaymentApp.trim()) {
      setError("Please specify the payment app name");
      return;
    }
    if (form.inventoryId && isOverStock) {
      const prod = products.find((p) => p.id === form.inventoryId);
      setError(`Insufficient office stock for "${prod?.name ?? "selected product"}". Requested: ${requestedQty}, Available: ${selectedProductStock?.officeStock ?? 0}.`);
      return;
    }

    const qty = Number(form.qty) || 1;
    const rate = Number(form.unitRate);
    const fd = new FormData();
    fd.append("type", form.type);
    fd.append("inventoryId", form.inventoryId);
    fd.append("description", form.description);
    fd.append("qty", String(qty));
    fd.append("unitRate", String(rate));
    fd.append("amount", String(qty * rate));
    fd.append("paymentMode", finalPaymentMode);
    fd.append("remarks", form.remarks);
    
    // Combine date and time
    const combinedDateObj = new Date(`${form.txnDate || selectedDate}T${form.txnTime || "12:00"}:00`);
    fd.append("date", combinedDateObj.toISOString());
    fd.append("addedById", userId);
    if (form.type === "REGULATOR") {
      fd.append("regulatorNo", form.regulatorNo.trim());
    }
    if (form.type === "REGULATOR_REPLACE") {
      fd.append("oldRegulatorNo", form.oldRegulatorNo.trim());
      fd.append("newRegulatorNo", form.newRegulatorNo.trim());
    }
    if (selectedCustomer) {
      fd.append("customerId", selectedCustomer.id);
    }

    startTransition(async () => {
      const result = await createOfficeTransaction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.transaction) {
        setTransactions((prev) => [result.transaction!, ...prev]);
        setModalOpen(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result = await deleteOfficeTransaction(fd);
      if (result.success) setTransactions((prev) => prev.filter((t) => t.id !== id));
    });
  }

  const dayTotal = filteredTxns.reduce((a, t) => a + t.amount, 0);

  const selectedProduct = products.find((p) => p.id === form.inventoryId);

  return (
    <>
      {/* Top Navigation & KPI Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setFilterType("ALL");
                  setForm((f) => ({ ...f, type: tab === "Inventory" ? "OTHER" : "NEW_CONNECTION" }));
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  activeTab === tab ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 px-3.5 py-1.5 shadow-2xs flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Txns</p>
              <p className="text-sm font-extrabold text-slate-800">{filteredTxns.length}</p>
            </div>
            <div className="h-6 w-px bg-slate-100" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
              <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(dayTotal)}</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Priority Filters Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-3.5 mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search customer, phone, serial no, item, remarks..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filterSearch && (
              <button
                onClick={() => setFilterSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Scope & Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setDateScope("SINGLE")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition",
                  dateScope === "SINGLE" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setDateScope("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition",
                  dateScope === "ALL" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                All Dates
              </button>
            </div>

            {dateScope === "SINGLE" && (
              <CalendarPicker value={selectedDate} onChange={setSelectedDate} />
            )}

            {/* Subtype Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              {activeTab === "Inventory" ? (
                <>
                  <option value="REGULATOR">Regulator — New Issue</option>
                  <option value="REGULATOR_REPLACE">Regulator — Replacement</option>
                  <option value="PIPE">Pipe Fitting</option>
                  <option value="OTHER">Other Inventory</option>
                </>
              ) : (
                <>
                  <option value="NEW_CONNECTION">New Connection (NC)</option>
                  <option value="CYLINDER_REFILL">Cylinder Refill</option>
                </>
              )}
            </select>

            {/* Payment Mode Filter */}
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit / Udhaari</option>
              <option value="ONLINE">Online / UPI (All)</option>
              <option value="PhonePe">PhonePe</option>
              <option value="GPay">GPay</option>
              <option value="Paytm">Paytm</option>
            </select>

            {/* Reset Filters Button */}
            {(filterSearch || filterType !== "ALL" || filterPayment !== "ALL" || dateScope !== "SINGLE") && (
              <button
                type="button"
                onClick={() => {
                  setFilterSearch("");
                  setFilterType("ALL");
                  setFilterPayment("ALL");
                  setDateScope("SINGLE");
                }}
                className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description / Inventory</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Unit Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Payment</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Remarks</th>
                {canEdit && <th className="px-4 py-3 text-center font-semibold text-slate-600">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-14 text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400 text-sm">No transactions for this date</p>
                </td></tr>
              ) : filteredTxns.map((t) => (
                <tr key={t.id} className="table-row border-b border-slate-50 last:border-0 hover:bg-slate-50/55 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-full font-bold tracking-wide">
                      {typeMap[t.type] ?? t.type}
                    </span>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                      <Clock className="w-3 h-3" />
                      {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.customer ? (
                      <div>
                        <div className="font-bold text-slate-800 text-[13px]">{t.customer.name}</div>
                        <div className="text-[11px] text-slate-400 font-semibold">{t.customer.phone}</div>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 italic">Walk-in Customer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">
                    {(t.type === "REGULATOR" || t.type === "REGULATOR_REPLACE") && t.description ? (() => {
                      // Extract serial number(s) from auto-generated description
                      const issuedMatch = t.description.match(/S\/N:\s*([^\)]+)\)/);
                      const oldMatch = t.description.match(/Old:\s*([^\s]+)\s*➔/);
                      const newMatch = t.description.match(/➔\s*New:\s*([^\)]+)\)/);
                      return (
                        <div className="space-y-1">
                          {issuedMatch && (
                            <span className="inline-flex items-center gap-1 bg-blue-100/80 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-wide">
                              🔧 S/N: {issuedMatch[1].trim()}
                            </span>
                          )}
                          {oldMatch && newMatch && (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 bg-amber-100/80 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">
                                ↩ Returned: {oldMatch[1].trim()}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">
                                ✓ Issued: {newMatch[1].trim()}
                              </span>
                            </div>
                          )}
                          {!issuedMatch && !oldMatch && (
                            <span className="text-slate-600">{t.description}</span>
                          )}
                        </div>
                      );
                    })() : (
                      t.product?.name ?? t.description ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{t.qty}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.unitRate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{getPaymentModeDisplay(t.paymentMode)}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.remarks ?? "—"}</td>
                  {canEdit && <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>}
                </tr>
              ))}
              {filteredTxns.length > 0 && <tr className="bg-slate-50 font-bold border-t border-slate-150">
                <td colSpan={5} className="px-4 py-3 text-right text-slate-600">Total</td>
                <td className="px-4 py-3 text-right text-slate-800 text-base">{formatCurrency(dayTotal)}</td>
                <td colSpan={canEdit ? 3 : 2}></td>
              </tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={step === 1 ? "Select Customer" : step === 2 ? `Add ${activeTab} Details` : "Confirm & Review"}
        size="md"
      >
        <div className="space-y-4">
          <StepIndicator step={step} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT CUSTOMER */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-1.5 p-1 rounded-xl w-fit bg-slate-100">
                <button
                  type="button"
                  onClick={() => setSearchMode("name")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    searchMode === "name" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Search className="w-3.5 h-3.5" /> Name / Phone
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("conn")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    searchMode === "conn" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Hash className="w-3.5 h-3.5" /> Connection No.
                </button>
              </div>

              {searchMode === "name" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nameQuery}
                      onChange={(e) => {
                        setNameQuery(e.target.value);
                        if (selectedCustomer) setSelectedCustomer(null);
                      }}
                      placeholder="Search by customer name, phone, code..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                  </div>

                  {nameQuery.trim().length >= 2 && nameResults.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No matching customer found.
                    </div>
                  )}

                  {nameResults.length > 0 && !selectedCustomer && (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {nameResults.map((c) => (
                        <CustomerCard key={c.id} c={c} onClick={() => setSelectedCustomer(c)} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={connInputRef}
                      type="text"
                      value={connNo}
                      onChange={(e) => {
                        setConnNo(e.target.value);
                        if (selectedCustomer) setSelectedCustomer(null);
                      }}
                      placeholder="Enter connection number..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                  </div>

                  {connNo.trim() && connResults.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No customer found with connection number &quot;{connNo}&quot;
                    </div>
                  )}

                  {connResults.length > 0 && !selectedCustomer && (
                    <div className="space-y-2">
                      {connResults.map((c) => (
                        <CustomerCard key={c.id} c={c} onClick={() => setSelectedCustomer(c)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedCustomer && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Customer Verified
                  </div>
                  <CustomerCard c={selectedCustomer} selected />
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setNameQuery(""); setConnNo(""); }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Select different customer
                  </button>
                </div>
              )}

              <div className="pt-2 flex justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setStep(2);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 shadow-xs"
                >
                  Skip — Walk-in Customer <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: TRANSACTION DETAILS */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Customer Strip */}
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{selectedCustomer.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{selectedCustomer.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline transition-all"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 italic">Walk-in Customer (No customer linked)</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-800 underline transition-all"
                  >
                    Link Customer
                  </button>
                </div>
              )}

              {/* Editable Date & Time Fields (Defaults to current live date/time) */}
              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Transaction Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.txnDate}
                    onChange={(e) => setForm({ ...form, txnDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Transaction Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={form.txnTime}
                    onChange={(e) => setForm({ ...form, txnTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Type *</label>
                  {activeTab === "Cylinder / Gas New Connection" ? (
                    <SelectWithAdd
                      value={form.type}
                      onChange={(val) => setForm({ ...form, type: val })}
                      options={cylinderTypeOptions}
                      addLabel="Type"
                      onAdd={(label, value) =>
                        setCylinderTypeOptions((prev) => [...prev, { value, label }])
                      }
                    />
                  ) : (
                    <SelectWithAdd
                      value={form.type}
                      onChange={(val) => setForm({ ...form, type: val })}
                      options={inventoryTypeOptions}
                      addLabel="Type"
                      onAdd={(label, value) =>
                        setInventoryTypeOptions((prev) => [...prev, { value, label }])
                      }
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Inventory / Product</label>
                  <select
                    value={form.inventoryId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white",
                      isOverStock
                        ? "border-red-400 focus:ring-red-400"
                        : "border-slate-200 focus:ring-blue-500"
                    )}
                  >
                    <option value="">Select (optional)...</option>
                    {products.map((p) => {
                      const pStock = stockMap[p.id]?.officeStock ?? null;
                      const outOfStock = pStock !== null && pStock === 0;
                      return (
                        <option key={p.id} value={p.id} disabled={outOfStock}>
                          {p.name}{pStock !== null ? ` — Office: ${pStock} units` : ""}{outOfStock ? " (Out of stock)" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Stock Badges */}
                  {form.inventoryId && selectedProductStock && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs",
                        selectedProductStock.officeStock === 0
                          ? "bg-red-100 text-red-700"
                          : isOverStock
                          ? "bg-orange-100 text-orange-700"
                          : "bg-emerald-100 text-emerald-700"
                      )}>
                        🏪 Office: {selectedProductStock.officeStock} units
                      </span>
                      {selectedProductStock.godownStock > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shadow-xs">
                          🏭 Godown: {selectedProductStock.godownStock} units
                        </span>
                      )}
                    </div>
                  )}

                  {form.inventoryId && selectedProductStock?.officeStock === 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-red-600">
                      <PackageX className="w-3.5 h-3.5" /> Out of Stock
                    </div>
                  )}
                  {isOverStock && selectedProductStock!.officeStock > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-orange-600 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" /> Exceeds stock ({selectedProductStock!.officeStock} units available)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional details (e.g. Serial number, specifications)..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              {/* Mandatory Customer Warning for Regulators */}
              {(form.type === "REGULATOR" || form.type === "REGULATOR_REPLACE") && !selectedCustomer && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-bold text-amber-900 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Customer selection is required for Regulator transactions.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition"
                  >
                    Select Customer
                  </button>
                </div>
              )}

              {/* REGULATOR — NEW ISSUE SUB-FORM */}
              {form.type === "REGULATOR" && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-blue-900 flex items-center justify-between">
                    <span>Regulator Serial Number *</span>
                    <span className="text-[10px] font-normal text-blue-700">Printed on physical unit</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={form.regulatorNo}
                    onChange={(e) => setForm({ ...form, regulatorNo: e.target.value })}
                    placeholder="Enter serial number (e.g. REG-109283)..."
                    className="w-full px-3.5 py-2 border border-blue-200 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* REGULATOR — REPLACEMENT SUB-FORM */}
              {form.type === "REGULATOR_REPLACE" && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      Returned (Old) Regulator Serial Number *
                    </label>
                    <div className="flex gap-2">
                      <input
                        required
                        type="text"
                        value={form.oldRegulatorNo}
                        onChange={(e) => {
                          setForm({ ...form, oldRegulatorNo: e.target.value });
                          setOldRegulatorRecord(null);
                          setOldRegulatorError(null);
                        }}
                        placeholder="Enter returned serial number..."
                        className="w-full px-3.5 py-2 border border-indigo-200 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyOldRegulator()}
                        disabled={regulatorCheckLoading || !form.oldRegulatorNo.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex-shrink-0"
                      >
                        {regulatorCheckLoading ? "Checking..." : "Verify"}
                      </button>
                    </div>

                    {oldRegulatorError && (
                      <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-red-700">{oldRegulatorError}</p>
                      </div>
                    )}

                    {/* Verified customer card — expanded details */}
                    {oldRegulatorRecord && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-300 rounded-xl p-3 animate-fadeIn">
                        <p className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Regulator Verified — Customer Details
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Customer Name</p>
                            <p className="text-[12px] font-extrabold text-slate-800 mt-0.5">{oldRegulatorRecord.customer?.name ?? "—"}</p>
                          </div>
                          <div className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Consumer No.</p>
                            <p className="text-[12px] font-extrabold text-slate-800 mt-0.5">{oldRegulatorRecord.customer?.customerCode ?? "N/A"}</p>
                          </div>
                          <div className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Mobile No.</p>
                            <p className="text-[12px] font-extrabold text-slate-800 mt-0.5">{oldRegulatorRecord.customer?.phone ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prompt to verify first before filling new number */}
                    {!oldRegulatorRecord && !oldRegulatorError && form.oldRegulatorNo.trim() && (
                      <p className="text-[11px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Click "Verify" to confirm this serial number before proceeding.
                      </p>
                    )}
                  </div>

                  {/* New serial — only shown after successful verification */}
                  <div className={cn("transition-all duration-300", !oldRegulatorRecord ? "opacity-40 pointer-events-none" : "")}>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      New Regulator Serial Number (Issuing) *
                      {!oldRegulatorRecord && <span className="ml-1 text-[10px] font-normal text-indigo-400">(Verify old number first)</span>}
                    </label>
                    <input
                      required
                      type="text"
                      value={form.newRegulatorNo}
                      onChange={(e) => setForm({ ...form, newRegulatorNo: e.target.value })}
                      placeholder={oldRegulatorRecord ? "Enter new serial number..." : "Verify old number first..."}
                      className="w-full px-3.5 py-2 border border-indigo-200 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 text-center font-semibold",
                      isOverStock
                        ? "border-red-400 bg-red-50 focus:ring-red-400 text-red-700 font-bold"
                        : "border-slate-200 focus:ring-blue-500 bg-slate-50/50"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Unit Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.unitRate}
                    onChange={(e) => setForm({ ...form, unitRate: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 font-semibold"
                  />
                </div>
              </div>

              {/* Payment Mode Selection (Chips) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "CASH", label: "Cash", icon: "💵" },
                    { val: "PhonePe", label: "PhonePe", icon: "📱" },
                    { val: "GPay", label: "GPay", icon: "🔵" },
                    { val: "Paytm", label: "Paytm", icon: "💙" },
                    ...(selectedCustomer?.type === "COMMERCIAL"
                      ? [{ val: "CREDIT", label: "Credit", icon: "📒" }]
                      : []),
                    { val: "Others", label: "Others", icon: "➕" }
                  ].map(({ val, label, icon }) => {
                    const active = form.paymentMode === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, paymentMode: val });
                          if (val !== "Others") setOtherPaymentApp("");
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 shadow-xs",
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.paymentMode === "Others" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Specify Payment App *</label>
                  <input
                    required
                    value={otherPaymentApp}
                    onChange={(e) => setOtherPaymentApp(e.target.value)}
                    placeholder="Enter payment app name (e.g. Bhim UPI, WhatsApp Pay)..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              )}

              {form.qty && form.unitRate && (
                <div className={cn(
                  "border rounded-xl px-4 py-2.5 text-xs flex flex-col gap-1.5 shadow-xs transition-all duration-300",
                  form.paymentMode === "CREDIT"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-slate-50 border-slate-100 text-slate-700"
                )}>
                  <div className="flex justify-between items-center">
                    <span className={form.paymentMode === "CREDIT" ? "text-amber-700 font-bold" : "text-slate-500 font-semibold"}>
                      Total Amount:
                    </span>
                    <span className={cn(
                      "text-sm font-extrabold",
                      form.paymentMode === "CREDIT" ? "text-amber-800" : "text-slate-800"
                    )}>
                      {formatCurrency(Number(form.qty) * Number(form.unitRate))}
                    </span>
                  </div>
                  {form.paymentMode === "CREDIT" && (
                    <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>This amount will be added to {selectedCustomer?.name}&apos;s Credit Ledger (Udhaari).</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks</label>
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Any internal remarks..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={isOverStock || (form.type === "REGULATOR_REPLACE" && !oldRegulatorRecord)}
                  title={form.type === "REGULATOR_REPLACE" && !oldRegulatorRecord ? "You must verify the returned regulator serial number before continuing" : undefined}
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & REVIEW */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Transaction Summary
                </h4>

                <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Customer</p>
                    <p className="font-bold text-slate-800">
                      {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
                    </p>
                    {selectedCustomer && <p className="text-[10px] text-slate-500 font-semibold">{selectedCustomer.phone}</p>}
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Transaction Type</p>
                    <p className="font-bold text-slate-800">
                      {typeMap[form.type] ?? form.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Product</p>
                    <p className="font-bold text-slate-800">
                      {selectedProduct ? selectedProduct.name : form.description || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Quantity × Rate</p>
                    <p className="font-bold text-slate-800">
                      {form.qty} × {formatCurrency(Number(form.unitRate))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Total Amount</p>
                    <p className="font-extrabold text-blue-700 text-sm">
                      {formatCurrency(Number(form.qty) * Number(form.unitRate))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold mb-0.5">Payment Mode</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {form.paymentMode === "Others" ? otherPaymentApp : getPaymentModeDisplay(form.paymentMode)}
                    </span>
                  </div>
                  {form.type === "REGULATOR" && form.regulatorNo && (
                    <div className="col-span-2 bg-blue-100/70 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900 font-bold">
                      Issued Regulator Serial No: <span className="font-extrabold text-blue-900">{form.regulatorNo}</span>
                    </div>
                  )}

                  {form.type === "REGULATOR_REPLACE" && (
                    <div className="col-span-2 bg-indigo-100/70 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-900 space-y-1">
                      <p className="font-bold text-indigo-900">
                        Returned Serial No: <span className="font-extrabold text-indigo-950">{form.oldRegulatorNo}</span>
                      </p>
                      <p className="font-bold text-indigo-900">
                        New Serial No: <span className="font-extrabold text-indigo-950">{form.newRegulatorNo}</span>
                      </p>
                    </div>
                  )}

                  <div className="col-span-2">
                    <p className="text-slate-400 font-semibold mb-0.5">Transaction Date & Time</p>
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {form.txnDate ? formatDate(form.txnDate) : formatDate(new Date())} at{" "}
                      {form.txnTime
                        ? new Date(`2000-01-01T${form.txnTime}`).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                        : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                  {form.remarks && (
                    <div className="col-span-2">
                      <p className="text-slate-400 font-semibold mb-0.5">Remarks</p>
                      <p className="text-slate-600 bg-white border border-slate-150 rounded-lg p-2 font-medium italic">
                        &ldquo;{form.remarks}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSubmit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isPending ? "Processing..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
