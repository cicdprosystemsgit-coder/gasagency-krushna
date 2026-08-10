"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatsCard } from "@/components/ui/StatsCard";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Truck, Package, Wallet, Users, Hash, Search,
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, User,
  Building2, Phone, MapPin, FileText, Cylinder, IndianRupee,
  Barcode, RotateCcw, Clock, CalendarDays, CreditCard,
  AlertCircle, Check, Camera, UploadCloud, Loader2,
} from "lucide-react";
import { createDeliveryRecord } from "@/app/actions/deliveries";
import { CalendarPicker } from "@/components/ui/CalendarPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface ProductRecord {
  id: string;
  name: string;
  saleRate: number;
}

export interface DeliveryRecord {
  id: string;
  date: string;
  createdAt: string;
  deliveredQty: number;
  returnedQty: number;
  pendingQty: number;
  cashCollected: number;
  paymentMode: string;
  creditAmount: number;
  status: string;
  customer: { name: string; phone: string; address: string | null; type: string; customerCode: string | null };
  product: { name: string; saleRate: number };
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAccuracy?: number | null;
}

interface AssignedVehicle {
  vehicleNo: string;
  vehicleName: string;
  vehicleType: string;
}

export interface TodayTrip {
  departureTime: string | null;
  returnTime: string | null;
  tripStatus: string;
}

interface Props {
  initialDeliveries: DeliveryRecord[];
  customers: CustomerRecord[];
  products: ProductRecord[];
  userId: string;
  assignedVehicle?: AssignedVehicle | null;
  todayTrip?: TodayTrip | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const inputSty = { borderColor: "#D4D4D8", background: "#FAFAFA", color: "#18181B" };
const labelCls = "block text-[12px] font-medium mb-1.5";
const labelSty = { color: "#52525B" };

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Find Customer", "Delivery Details", "Review & Confirm"];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                style={done
                  ? { background: "#16A34A", color: "#fff" }
                  : active
                    ? { background: "#2563EB", color: "#fff" }
                    : { background: "#E4E4E7", color: "#A1A1AA" }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: active ? "#2563EB" : done ? "#16A34A" : "#A1A1AA" }}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4"
                style={{ background: step > num ? "#16A34A" : "#E4E4E7" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard({ c, selected, onClick }: { c: CustomerRecord; selected?: boolean; onClick?: () => void }) {
  const isDomestic = c.type === "DOMESTIC";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3.5 transition-all"
      style={{
        border: selected ? "2px solid #2563EB" : "1px solid #E4E4E7",
        background: selected ? "#EFF6FF" : "#FAFAFA",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] text-white flex-shrink-0"
          style={{ background: isDomestic ? "#2563EB" : "#7C3AED" }}
        >
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14px]" style={{ color: "#18181B" }}>{c.name}</span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={isDomestic
                ? { background: "#EFF6FF", color: "#2563EB" }
                : { background: "#F5F3FF", color: "#7C3AED" }}
            >
              {isDomestic ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
              {isDomestic ? "Regular" : "Commercial"}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 text-[12px]" style={{ color: "#71717A" }}>
              <Phone className="w-3 h-3" />{c.phone}
            </span>
            {c.customerCode && (
              <span className="flex items-center gap-1 text-[12px] font-mono" style={{ color: "#2563EB" }}>
                <Hash className="w-3 h-3" />{c.customerCode}
              </span>
            )}
            {!isDomestic && c.contactPerson && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "#71717A" }}>
                <User className="w-3 h-3" />{c.contactPerson}
              </span>
            )}
            {!isDomestic && c.businessType && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "#71717A" }}>
                <Building2 className="w-3 h-3" />{c.businessType}
              </span>
            )}
          </div>
          {c.address && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px]" style={{ color: "#A1A1AA" }}>
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{c.address}</span>
            </div>
          )}
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#2563EB" }} />}
      </div>
    </button>
  );
}

// ─── Step 1: Find Customer ────────────────────────────────────────────────────

function Step1FindCustomer({
  customers,
  selected,
  onSelect,
}: {
  customers: CustomerRecord[];
  selected: CustomerRecord | null;
  onSelect: (c: CustomerRecord) => void;
}) {
  const [connNo, setConnNo] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"conn" | "name">("conn");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const connResults: CustomerRecord[] = connNo.trim()
    ? customers.filter((c) =>
      c.customerCode != null &&
      c.customerCode.toLowerCase().includes(connNo.trim().toLowerCase())
    )
    : [];

  const nameResults: CustomerRecord[] = nameQuery.trim().length >= 2
    ? customers.filter((c) => {
      const q = nameQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.contactPerson ?? "").toLowerCase().includes(q)
      );
    }).slice(0, 8)
    : [];

  return (
    <div>
      <StepIndicator step={1} />

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: "#F4F4F5" }}>
        <button
          type="button"
          onClick={() => setSearchMode("conn")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={searchMode === "conn"
            ? { background: "#FFFFFF", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "#71717A" }}
        >
          <Barcode className="w-3.5 h-3.5" /> Connection No.
        </button>
        <button
          type="button"
          onClick={() => setSearchMode("name")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={searchMode === "name"
            ? { background: "#FFFFFF", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "#71717A" }}
        >
          <Search className="w-3.5 h-3.5" /> Name / Phone
        </button>
      </div>

      {/* Connection number search */}
      {searchMode === "conn" && (
        <div className="space-y-3">
          <div>
            <label className={labelCls} style={labelSty}>
              Enter Connection Number
              <span className="ml-1 text-[11px] font-normal" style={{ color: "#A1A1AA" }}>
                (from gas company registration paper)
              </span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A1A1AA" }} />
              <input
                ref={inputRef}
                type="text"
                value={connNo}
                onChange={(e) => {
                  setConnNo(e.target.value);
                  if (selected) onSelect(null as unknown as CustomerRecord);
                }}
                placeholder="e.g. 1234567890"
                className={inputCls}
                style={{ ...inputSty, paddingLeft: "2.5rem", fontSize: "16px", letterSpacing: "0.05em" }}
              />
              {connNo && (
                <button
                  type="button"
                  onClick={() => { setConnNo(""); onSelect(null as unknown as CustomerRecord); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <XCircle className="w-4 h-4" style={{ color: "#A1A1AA" }} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {connNo.trim() && connResults.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
              <div>
                <p className="text-[12px] font-medium" style={{ color: "#DC2626" }}>No customer found</p>
                <p className="text-[11px]" style={{ color: "#DC2626" }}>
                  No customer with connection number <strong>{connNo}</strong>. Try the Name/Phone search.
                </p>
              </div>
            </div>
          )}

          {connResults.length > 0 && !selected && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#A1A1AA" }}>
                {connResults.length} MATCH{connResults.length > 1 ? "ES" : ""} FOUND
              </p>
              {connResults.map((cust: CustomerRecord) => (
                <CustomerCard key={cust.id} c={cust} selected={false} onClick={() => onSelect(cust)} />
              ))}
            </div>
          )}

          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
                <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#16A34A" }}>
                  Customer Verified
                </span>
              </div>
              <CustomerCard c={selected} selected />
              <button
                type="button"
                onClick={() => { onSelect(null as unknown as CustomerRecord); setConnNo(""); }}
                className="mt-2 text-[12px] flex items-center gap-1"
                style={{ color: "#71717A" }}
              >
                <RotateCcw className="w-3 h-3" /> Search again
              </button>
            </div>
          )}

          {!selected && !connNo && (
            <div className="px-4 py-6 rounded-xl text-center" style={{ background: "#F8F8F8", border: "1px dashed #D4D4D8" }}>
              <Barcode className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>Enter the connection number</p>
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
                This number is printed on the customer&apos;s gas company registration card
              </p>
            </div>
          )}
        </div>
      )}

      {/* Name / Phone search */}
      {searchMode === "name" && (
        <div className="space-y-3">
          <div>
            <label className={labelCls} style={labelSty}>Search by Name or Phone</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A1A1AA" }} />
              <input
                ref={inputRef}
                type="text"
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  if (selected) onSelect(null as unknown as CustomerRecord);
                }}
                placeholder="Type at least 2 characters..."
                className={inputCls}
                style={{ ...inputSty, paddingLeft: "2.5rem" }}
              />
              {nameQuery && (
                <button
                  type="button"
                  onClick={() => { setNameQuery(""); onSelect(null as unknown as CustomerRecord); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <XCircle className="w-4 h-4" style={{ color: "#A1A1AA" }} />
                </button>
              )}
            </div>
          </div>

          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
                <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#16A34A" }}>
                  Customer Selected
                </span>
              </div>
              <CustomerCard c={selected} selected />
              <button
                type="button"
                onClick={() => { onSelect(null as unknown as CustomerRecord); setNameQuery(""); }}
                className="mt-2 text-[12px] flex items-center gap-1"
                style={{ color: "#71717A" }}
              >
                <RotateCcw className="w-3 h-3" /> Search again
              </button>
            </div>
          )}

          {!selected && nameQuery.trim().length >= 2 && nameResults.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
              <p className="text-[12px]" style={{ color: "#DC2626" }}>No customers found matching &quot;{nameQuery}&quot;</p>
            </div>
          )}

          {!selected && nameResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#A1A1AA" }}>
                {nameResults.length} RESULT{nameResults.length > 1 ? "S" : ""}
              </p>
              {nameResults.map((c) => (
                <CustomerCard key={c.id} c={c} onClick={() => onSelect(c)} />
              ))}
            </div>
          )}

          {!selected && nameQuery.trim().length < 2 && (
            <div className="px-4 py-6 rounded-xl text-center" style={{ background: "#F8F8F8", border: "1px dashed #D4D4D8" }}>
              <Search className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>Search by name or phone</p>
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>Type at least 2 characters to see results</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Delivery Details ─────────────────────────────────────────────────

interface DeliveryForm {
  productId: string;
  deliveredQty: string;
  returnedQty: string;
  pendingQty: string;
  emptyPending: string;            // Empty cylinders not yet returned by commercial customer
  bookingQty: string;              // Number of cylinders booked (default 1)
  cashCollected: string;
  creditAmount: string;
  paymentMode: string;
  partialCollectionMode: string;   // How the cash part of PARTIAL was collected
  partialCollectionOther: string;  // Custom app name if partialCollectionMode === "Others"
  notes: string;
  date: string;
  otherPaymentApp?: string;        // Custom app name for main "Others" payment mode
}

function Step2DeliveryDetails({
  customer,
  products,
  form,
  onChange,
  error,
  proofPhotos,
  photoUploading,
  onUploadPhoto,
}: {
  customer: CustomerRecord;
  products: ProductRecord[];
  form: DeliveryForm;
  onChange: (f: Partial<DeliveryForm>) => void;
  error: string;
  proofPhotos: { paymentReceiptUrl: string | null; customerCardUrl: string | null; additionalImageUrl: string | null };
  photoUploading: { payment_receipt: boolean; customer_card: boolean; additional: boolean };
  onUploadPhoto: (file: File, type: "payment_receipt" | "customer_card" | "additional") => void;
}) {
  const selectedProduct = products.find((p) => p.id === form.productId);
  const totalValue = selectedProduct && selectedProduct.saleRate > 0
    ? selectedProduct.saleRate * (Number(form.deliveredQty) || 0)
    : 0;

  const isDomestic = customer.type === "DOMESTIC";

  // ── Payment mode chip options ─────────────────────────────────────────────
  // DOMESTIC: no Credit/Udhari; COMMERCIAL: full set including Credit/Udhari
  const mainModes = isDomestic
    ? [
      { val: "CASH", label: "Cash", icon: "💵" },
      { val: "PhonePe", label: "PhonePe", icon: "📱" },
      { val: "GPay", label: "GPay", icon: "🔵" },
      { val: "Paytm", label: "Paytm", icon: "💙" },
      { val: "Paybook", label: "Paybook", icon: "📖" },
      { val: "Others", label: "Others", icon: "➕" },
      { val: "PARTIAL", label: "Partial Payment", icon: "💳" },
    ]
    : [
      { val: "CASH", label: "Cash", icon: "💵" },
      { val: "PhonePe", label: "PhonePe", icon: "📱" },
      { val: "GPay", label: "GPay", icon: "🔵" },
      { val: "Paytm", label: "Paytm", icon: "💙" },
      { val: "Paybook", label: "Paybook", icon: "📖" },
      { val: "PARTIAL", label: "Partial Payment", icon: "💳" },
      { val: "CREDIT", label: "Credit / Udhari", icon: "📒" },
      { val: "Others", label: "Others", icon: "➕" },
    ];

  // For DOMESTIC partial: online modes (PhonePe/GPay/Paytm/Others) for the second portion
  const onlineModes = [
    { val: "PhonePe", label: "PhonePe" },
    { val: "GPay", label: "GPay" },
    { val: "Paytm", label: "Paytm" },
    { val: "Others", label: "Others" },
  ];

  // For COMMERCIAL partial: cash collection modes (how cash was received)
  const collectionModes = [
    { val: "CASH", label: "Cash" },
    { val: "PhonePe", label: "PhonePe" },
    { val: "GPay", label: "GPay" },
    { val: "Paytm", label: "Paytm" },
    { val: "Others", label: "Others" },
  ];

  return (
    <div>
      <StepIndicator step={2} />

      {/* ── Customer reminder strip ───────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0"
          style={{ background: isDomestic ? "#2563EB" : "#7C3AED" }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px]" style={{ color: "#18181B" }}>{customer.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px]" style={{ color: "#71717A" }}>{customer.phone}</span>
            {customer.customerCode && (
              <span className="flex items-center gap-0.5 text-[11px] font-mono" style={{ color: "#2563EB" }}>
                <Hash className="w-2.5 h-2.5" />{customer.customerCode}
              </span>
            )}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={isDomestic
                ? { background: "#EFF6FF", color: "#2563EB" }
                : { background: "#F5F3FF", color: "#7C3AED" }}>
              {isDomestic ? "Regular" : "Commercial"}
            </span>
          </div>
        </div>
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#16A34A" }} />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
          <span className="text-[12px]" style={{ color: "#DC2626" }}>{error}</span>
        </div>
      )}

      <div className="space-y-5">

        {/* ── STEP A: Date ─────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#71717A" }}>① Delivery Date</p>
          <CalendarPicker value={form.date} onChange={(val) => onChange({ date: val })} />
        </div>

        {/* ── STEP B: Product ───────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#71717A" }}>② Product / Cylinder</p>
          <select
            value={form.productId}
            onChange={(e) => onChange({ productId: e.target.value })}
            className={inputCls}
            style={inputSty}
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.saleRate > 0 ? ` — ₹${p.saleRate}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* ── STEP C: Cylinder Count ────────────────────────────────────── */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>③ Cylinder Count</p>

          {/* COMMERCIAL: 5-column layout */}
          {!isDomestic ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* 1. Booking Cylinder */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#4F46E5" }}>Booking Cylinder</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.bookingQty || "1"}
                  onChange={(e) => {
                    const bVal = Number(e.target.value) || 0;
                    const dVal = Number(form.deliveredQty) || 0;
                    const pVal = Math.max(0, bVal - dVal);
                    onChange({ bookingQty: e.target.value, pendingQty: pVal.toString() });
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color: "#4F46E5" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Cylinders ordered</p>
              </div>

              {/* 2. Delivered */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#2563EB" }}>Delivered</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.deliveredQty}
                  onChange={(e) => {
                    const dVal = Number(e.target.value) || 0;
                    const rVal = Number(form.returnedQty) || 0;
                    const bVal = Number(form.bookingQty) || 0;
                    const ep   = Math.max(0, dVal - rVal);
                    const pVal = Math.max(0, bVal - dVal);
                    onChange({ deliveredQty: e.target.value, emptyPending: ep.toString(), pendingQty: pVal.toString() });
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color: "#2563EB" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Full cylinders given</p>
              </div>

              {/* 3. Empty Returned */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#16A34A" }}>Empty Returned</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.returnedQty}
                  onChange={(e) => {
                    const rVal = Number(e.target.value) || 0;
                    const dVal = Number(form.deliveredQty) || 0;
                    const ep   = Math.max(0, dVal - rVal);
                    onChange({ returnedQty: e.target.value, emptyPending: ep.toString() });
                  }}
                  className="w-full px-2 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-green-500"
                  style={{ borderColor: "#16A34A", background: "#FFFFFF", color: "#16A34A" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Empty cylinders collected</p>
              </div>

              {/* 4. Empty Pending */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#7C3AED" }}>Empty Pending</label>
                <input
                  type="number" inputMode="numeric" disabled readOnly
                  value={form.emptyPending}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none select-none cursor-not-allowed opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#EDE9FE", color: "#7C3AED" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Not returned (auto)</p>
              </div>

              {/* 5. Not Delivered (Cancelled) */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#D97706" }}>Not Delivered</label>
                <input
                  type="number" inputMode="numeric" disabled readOnly
                  value={form.pendingQty}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none select-none cursor-not-allowed opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFBEB", color: "#D97706" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Cancelled (auto)</p>
              </div>
            </div>
          ) : (
            /* DOMESTIC: 4-column layout */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Booking Cylinder */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#4F46E5" }}>Booking Cylinder</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.bookingQty || "1"}
                  onChange={(e) => {
                    const bVal = Number(e.target.value) || 0;
                    const dVal = Number(form.deliveredQty) || 0;
                    const pVal = Math.max(0, bVal - dVal);
                    onChange({ bookingQty: e.target.value, pendingQty: pVal.toString() });
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color: "#4F46E5" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Cylinders ordered</p>
              </div>

              {/* 2. Delivered */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#2563EB" }}>Delivered</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.deliveredQty}
                  onChange={(e) => {
                    const dVal = Number(e.target.value) || 0;
                    const bVal = Number(form.bookingQty) || 0;
                    const pVal = Math.max(0, bVal - dVal);
                    onChange({ deliveredQty: e.target.value, pendingQty: pVal.toString() });
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color: "#2563EB" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Full cylinders given</p>
              </div>

              {/* 3. Empty Returned */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#16A34A" }}>Empty Returned</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={form.returnedQty}
                  onChange={(e) => onChange({ returnedQty: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-green-500"
                  style={{ borderColor: "#16A34A", background: "#FFFFFF", color: "#16A34A" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Empty cylinders collected</p>
              </div>

              {/* 4. Not Delivered (Cancelled) */}
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: "#D97706" }}>Not Delivered</label>
                <input
                  type="number" inputMode="numeric" disabled readOnly
                  value={form.pendingQty}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none select-none cursor-not-allowed opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: "#D4D4D8", background: "#FFFBEB", color: "#D97706" }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>Cancelled (auto)</p>
              </div>
            </div>
          )}
        </div>

        {/* ── STEP D: Payment Method ────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#71717A" }}>④ Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {mainModes.map(({ val, label, icon }) => {
              const active = form.paymentMode === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChange({
                    paymentMode: val,
                    cashCollected: "",
                    creditAmount: "",
                    partialCollectionMode: isDomestic ? "PhonePe" : "CASH",
                    partialCollectionOther: "",
                    otherPaymentApp: "",
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: active ? "#2563EB" : "#E4E4E7",
                    background: active ? "#EFF6FF" : "#FFFFFF",
                    color: active ? "#1D4ED8" : "#52525B",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span className="text-[14px]">{icon}</span>
                  <span className="text-[12px]">{label}</span>
                  {active && (
                    <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: "#2563EB" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Others — custom app name */}
          {form.paymentMode === "Others" && (
            <div className="mt-3">
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#71717A" }}>Specify Payment App *</label>
              <input
                type="text"
                required
                value={form.otherPaymentApp || ""}
                onChange={(e) => onChange({ otherPaymentApp: e.target.value })}
                placeholder="Enter payment app name..."
                className="w-full px-3 py-2 rounded-lg text-[13px] border outline-none transition-colors focus:border-blue-500"
                style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color: "#18181B" }}
              />
            </div>
          )}
        </div>

        {/* ── STEP E: Payment Amount ────────────────────────────────────── */}
        {form.paymentMode !== "" && (
          <div className="rounded-xl p-4 space-y-4" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>⑤ Payment Amount</p>

            {/* ── CREDIT — full udhari (COMMERCIAL only) ── */}
            {form.paymentMode === "CREDIT" && (
              <>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                  <span className="text-[13px]">⚠️</span>
                  <p className="text-[11px] font-medium" style={{ color: "#92400E" }}>
                    <strong>Credit / Udhari selected</strong> — this amount will be added to the customer&apos;s Credit Ledger. Leave blank to auto-use product rate × qty.
                  </p>
                </div>
                <div>
                  <label className={labelCls} style={labelSty}>Credit / Udhari Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#D97706" }} />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.cashCollected}
                      onChange={(e) => onChange({ cashCollected: e.target.value })}
                      placeholder={totalValue > 0 ? `Auto: ₹${totalValue.toFixed(0)}` : "Enter amount..."}
                      className={inputCls}
                      style={{ ...inputSty, paddingLeft: "2.25rem", borderColor: "#F59E0B", background: "#FFFBEB" }}
                    />
                  </div>
                  {totalValue > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#92400E" }}>
                      📋 Rate: ₹{selectedProduct!.saleRate} × {form.deliveredQty || 0} = ₹{totalValue.toFixed(0)} (used if left blank)
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── CASH / PhonePe / GPay / Paytm / Paybook / Others — single amount ── */}
            {["CASH", "PhonePe", "GPay", "Paytm", "Paybook", "Others"].includes(form.paymentMode) && (
              <div>
                <label className={labelCls} style={labelSty}>
                  {form.paymentMode === "Paybook" ? "Amount Paid with Booking (₹)" : "Amount Collected (₹)"}
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                  <input
                    type="number" min="0" step="0.01"
                    value={form.cashCollected}
                    onChange={(e) => onChange({ cashCollected: e.target.value })}
                    placeholder="0.00"
                    className={inputCls}
                    style={{ ...inputSty, paddingLeft: "2.25rem" }}
                  />
                </div>
                {totalValue > 0 && (
                  <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
                    Rate: ₹{selectedProduct!.saleRate} × {form.deliveredQty || 0} = ₹{totalValue.toFixed(0)}
                  </p>
                )}
              </div>
            )}

            {/* ── PARTIAL — DOMESTIC: Cash + Online ── */}
            {form.paymentMode === "PARTIAL" && isDomestic && (
              <>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <span className="text-[13px]">💳</span>
                  <p className="text-[11px] font-medium" style={{ color: "#1D4ED8" }}>
                    <strong>Partial Payment</strong> — enter the cash collected first, then select the online payment method and enter that amount.
                  </p>
                </div>

                {/* Cash amount */}
                <div>
                  <label className={labelCls} style={labelSty}>Cash Collected (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.cashCollected}
                      onChange={(e) => {
                        const cashVal = Number(e.target.value) || 0;
                        const onlineAuto = totalValue > 0 ? Math.max(0, totalValue - cashVal).toFixed(2) : "";
                        onChange({ cashCollected: e.target.value, creditAmount: onlineAuto });
                      }}
                      placeholder="Cash amount received"
                      className={inputCls}
                      style={{ ...inputSty, paddingLeft: "2.25rem", borderColor: "#BBF7D0", background: "#F0FDF4" }}
                    />
                  </div>
                  {totalValue > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
                      Total: ₹{totalValue.toFixed(0)}
                    </p>
                  )}
                </div>

                {/* Online payment mode selector */}
                <div>
                  <label className={labelCls} style={labelSty}>Online Payment Via *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {onlineModes.map(({ val, label }) => {
                      const active = form.partialCollectionMode === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => onChange({ partialCollectionMode: val, partialCollectionOther: "" })}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all"
                          style={{
                            borderColor: active ? "#2563EB" : "#E4E4E7",
                            background: active ? "#EFF6FF" : "#FFFFFF",
                            color: active ? "#1D4ED8" : "#52525B",
                          }}
                        >
                          {active && <CheckCircle2 className="w-3 h-3" style={{ color: "#2563EB" }} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {form.partialCollectionMode === "Others" && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={form.partialCollectionOther}
                        onChange={(e) => onChange({ partialCollectionOther: e.target.value })}
                        placeholder="Specify app name (required) *"
                        className="w-full px-3 py-2 rounded-lg text-[13px] border outline-none transition-colors focus:border-blue-500"
                        style={{ borderColor: "#FCA5A5", background: "#FFF", color: "#18181B" }}
                      />
                    </div>
                  )}
                </div>

                {/* Online amount */}
                <div>
                  <label className={labelCls} style={labelSty}>Online Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.creditAmount}
                      onChange={(e) => onChange({ creditAmount: e.target.value })}
                      placeholder="Online amount received"
                      className={inputCls}
                      style={{ ...inputSty, paddingLeft: "2.25rem", borderColor: "#DDD6FE", background: "#F5F3FF" }}
                    />
                  </div>
                  {totalValue > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
                      Total: ₹{totalValue.toFixed(0)} — Cash: ₹{Number(form.cashCollected || 0).toFixed(0)} = Online: ₹{Math.max(0, totalValue - Number(form.cashCollected || 0)).toFixed(0)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── PARTIAL — COMMERCIAL: Collection mode + Cash + Credit/Udhari ── */}
            {form.paymentMode === "PARTIAL" && !isDomestic && (
              <>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <span className="text-[13px]">💳</span>
                  <p className="text-[11px] font-medium" style={{ color: "#1D4ED8" }}>
                    <strong>Partial Payment</strong> — select how the cash was collected, enter the cash amount, then enter the remaining credit/udhari.
                  </p>
                </div>

                {/* Cash collection method */}
                <div>
                  <label className={labelCls} style={labelSty}>Cash Collected Via *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {collectionModes.map(({ val, label }) => {
                      const active = form.partialCollectionMode === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => onChange({ partialCollectionMode: val, partialCollectionOther: "" })}
                          className="px-3 py-2 rounded-lg border text-center text-[12px] font-medium transition-all"
                          style={{
                            borderColor: active ? "#2563EB" : "#E4E4E7",
                            background: active ? "#EFF6FF" : "#FFFFFF",
                            color: active ? "#1D4ED8" : "#52525B",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {form.partialCollectionMode === "Others" && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={form.partialCollectionOther}
                        onChange={(e) => onChange({ partialCollectionOther: e.target.value })}
                        placeholder="Specify app name (required) *"
                        className="w-full px-3 py-2 rounded-lg text-[13px] border outline-none transition-colors focus:border-blue-500"
                        style={{ borderColor: "#FCA5A5", background: "#FFF", color: "#18181B" }}
                      />
                    </div>
                  )}
                </div>

                {/* Cash collected */}
                <div>
                  <label className={labelCls} style={labelSty}>Cash Collected (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.cashCollected}
                      onChange={(e) => {
                        const cashVal = Number(e.target.value) || 0;
                        const udhariAuto = totalValue > 0 ? Math.max(0, totalValue - cashVal).toFixed(2) : "";
                        onChange({ cashCollected: e.target.value, creditAmount: udhariAuto });
                      }}
                      placeholder="Amount received now"
                      className={inputCls}
                      style={{ ...inputSty, paddingLeft: "2.25rem", borderColor: "#BBF7D0", background: "#F0FDF4" }}
                    />
                  </div>
                </div>

                {/* Credit / udhari amount */}
                <div>
                  <label className={labelCls} style={labelSty}>Credit / Udhari Amount (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#D97706" }} />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.creditAmount}
                      onChange={(e) => onChange({ creditAmount: e.target.value })}
                      placeholder="Remaining amount on credit"
                      className={inputCls}
                      style={{ ...inputSty, paddingLeft: "2.25rem", borderColor: "#FDE68A", background: "#FFFBEB" }}
                    />
                  </div>
                  {totalValue > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#92400E" }}>
                      Total: ₹{totalValue.toFixed(0)} — Cash: ₹{Number(form.cashCollected || 0).toFixed(0)} = Udhari: ₹{Math.max(0, totalValue - Number(form.cashCollected || 0)).toFixed(0)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP F: Notes ─────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#71717A" }}>⑥ Notes (Optional)</p>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
            <textarea
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Any remarks, issues, customer requests..."
              rows={2}
              className={inputCls}
              style={{ ...inputSty, paddingLeft: "2.25rem", resize: "none" }}
            />
          </div>
        </div>

        {/* ── STEP G: Delivery Proof Photos (Phase 1 + Phase 2) ─────────── */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>
              ⑦ Delivery Proof Photos
            </p>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              IST Timestamp Watermarked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PhotoSlot
              label="1. Payment Receipt"
              required
              value={proofPhotos.paymentReceiptUrl}
              uploading={photoUploading.payment_receipt}
              onCapture={(file) => onUploadPhoto(file, "payment_receipt")}
            />
            <PhotoSlot
              label="2. Customer Card Entry"
              required
              value={proofPhotos.customerCardUrl}
              uploading={photoUploading.customer_card}
              onCapture={(file) => onUploadPhoto(file, "customer_card")}
            />
            <PhotoSlot
              label="3. Extra Photo"
              value={proofPhotos.additionalImageUrl}
              uploading={photoUploading.additional}
              onCapture={(file) => onUploadPhoto(file, "additional")}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Photo Upload Slot ────────────────────────────────────────────────────────

function PhotoSlot({
  label,
  required,
  value,
  uploading,
  onCapture,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  uploading: boolean;
  onCapture: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="rounded-xl border-2 transition-all p-3 space-y-2"
      style={{
        borderColor: value ? "#16A34A" : required ? "#FCA5A5" : "#D4D4D8",
        background: value ? "#F0FDF4" : "#FAFAFA",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold" style={{ color: "#18181B" }}>
          {label} {required && <span style={{ color: "#DC2626" }}>*</span>}
        </span>
        {value ? (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#DCFCE7", color: "#16A34A" }}
          >
            ✅ Uploaded
          </span>
        ) : required ? (
          <span className="text-[10px] font-semibold" style={{ color: "#DC2626" }}>Required</span>
        ) : (
          <span className="text-[10px]" style={{ color: "#A1A1AA" }}>Optional</span>
        )}
      </div>

      {/* Preview thumbnail */}
      {value && (
        <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", background: "#18181B" }}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Camera button */}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all"
        style={{
          background: uploading ? "#F4F4F5" : value ? "#DCFCE7" : "#EFF6FF",
          color: uploading ? "#A1A1AA" : value ? "#16A34A" : "#2563EB",
          border: `1px solid ${uploading ? "#D4D4D8" : value ? "#86EFAC" : "#93C5FD"}`,
          fontSize: "12px",
          fontWeight: 600,
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : value ? (
          <><Camera className="w-4 h-4" /> Retake Photo</>
        ) : (
          <><Camera className="w-4 h-4" /> {required ? "Take Photo" : "Add Photo (Optional)"}</>
        )}
      </button>

      {/* Hidden file input — opens rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onCapture(file);
            e.target.value = ""; // reset so same file can be re-selected
          }
        }}
      />
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────



function Step3Review({
  customer,
  form,
  product,
  proofPhotos,
}: {
  customer: CustomerRecord;
  form: DeliveryForm;
  product: ProductRecord | undefined;
  proofPhotos: { paymentReceiptUrl: string | null; customerCardUrl: string | null; additionalImageUrl: string | null };
}) {
  const isDomestic = customer.type === "DOMESTIC";
  const collectionLabel = form.partialCollectionMode === "Others"
    ? (form.partialCollectionOther || "Others")
    : (form.partialCollectionMode || "Cash");
  const paymentLabel =
    form.paymentMode === "CASH" ? "Cash"
      : form.paymentMode === "CREDIT" ? "Credit / Udhari (Full)"
        : form.paymentMode === "PARTIAL" ? `Partial (via ${collectionLabel} + Udhari)`
          : form.paymentMode === "Paybook" ? "Paybook (Already Paid)"
            : form.paymentMode === "Others" ? (form.otherPaymentApp || "Others")
              : form.paymentMode;

  const rows = [
    { label: "Customer", value: customer.name },
    { label: "Type", value: isDomestic ? "Regular (Domestic)" : "Commercial" },
    customer.customerCode
      ? { label: isDomestic ? "Connection No." : "Reg. No.", value: customer.customerCode, mono: true }
      : null,
    { label: "Phone", value: customer.phone },
    customer.address ? { label: "Address", value: customer.address } : null,
    !isDomestic && customer.contactPerson ? { label: "Contact Person", value: customer.contactPerson } : null,
    { label: "Product", value: product?.name ?? "—" },
    { label: "Date", value: new Date(form.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
    { label: "Booking Cylinder", value: `${form.bookingQty} cylinder${Number(form.bookingQty) !== 1 ? "s" : ""}` },
    { label: "Delivered", value: `${form.deliveredQty} cylinder${Number(form.deliveredQty) !== 1 ? "s" : ""}`, highlight: true },
    Number(form.returnedQty) > 0 ? { label: "Empty Returned", value: `${form.returnedQty} empty cylinder${Number(form.returnedQty) !== 1 ? "s" : ""}` } : null,
    !isDomestic && Number(form.emptyPending) > 0 ? { label: "Empty Pending", value: `${form.emptyPending} empty not returned`, warn: true } : null,
    Number(form.pendingQty) > 0 ? { label: "Not Delivered", value: `${form.pendingQty} cylinder${Number(form.pendingQty) !== 1 ? "s" : ""}`, warn: true } : null,
    { label: "Payment Mode", value: paymentLabel },
    form.paymentMode !== "CREDIT"
      ? { label: form.paymentMode === "PARTIAL" ? "Cash Received" : form.paymentMode === "Paybook" ? "Prepaid Amount" : "Amount Collected", value: `₹${Number(form.cashCollected || 0).toFixed(2)}`, highlight: true }
      : { label: "Credit Amount", value: `₹${Number(form.cashCollected || 0).toFixed(2)}`, warn: true },
    form.paymentMode === "PARTIAL" && Number(form.creditAmount) > 0
      ? { label: "Udhari (Credit)", value: `₹${Number(form.creditAmount).toFixed(2)}`, warn: true }
      : null,
    form.notes ? { label: "Notes", value: form.notes } : null,
  ].filter(Boolean);

  return (
    <div>
      <StepIndicator step={3} />

      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0FDF4" }}>
          <CheckCircle2 className="w-5 h-5" style={{ color: "#16A34A" }} />
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Delivery Summary</p>
          <p className="text-[11px]" style={{ color: "#71717A" }}>Please review before submitting</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5"
            style={{ background: i % 2 === 0 ? "#FAFAFA" : "#FFFFFF", borderBottom: "1px solid #F4F4F5" }}
          >
            <span className="text-[12px] w-28 flex-shrink-0 pt-0.5" style={{ color: "#71717A" }}>{row!.label}</span>
            <span
              className={`text-[13px] font-medium flex-1 ${(row as { mono?: boolean }).mono ? "font-mono" : ""}`}
              style={{
                color: (row as { highlight?: boolean }).highlight
                  ? "#2563EB"
                  : (row as { warn?: boolean }).warn
                    ? "#D97706"
                    : "#18181B",
              }}
            >
              {row!.value}
            </span>
          </div>
        ))}
      </div>

      {/* Proof Photo Thumbnails preview */}
      <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">📸 Verified Proof Photos Attached</p>
        <div className="grid grid-cols-3 gap-2">
          {proofPhotos.paymentReceiptUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-300 relative aspect-video bg-black">
              <img src={proofPhotos.paymentReceiptUrl} alt="Receipt" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-medium text-center py-0.5">Receipt</span>
            </div>
          )}
          {proofPhotos.customerCardUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-300 relative aspect-video bg-black">
              <img src={proofPhotos.customerCardUrl} alt="Card" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-medium text-center py-0.5">Customer Card</span>
            </div>
          )}
          {proofPhotos.additionalImageUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-300 relative aspect-video bg-black">
              <img src={proofPhotos.additionalImageUrl} alt="Extra" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-medium text-center py-0.5">Extra Photo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// [ignoring loop detection]
function GpsStatusBox({
  gps,
  onRetry,
}: {
  gps: { lat: number | null; lng: number | null; accuracy: number | null; loading: boolean; error: string | null };
  onRetry: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl p-3 border text-xs" style={{
      background: gps.loading ? "#F8F8F8" : gps.lat ? "#ECFDF5" : "#FEF2F2",
      borderColor: gps.loading ? "#E4E4E7" : gps.lat ? "#A7F3D0" : "#FCA5A5",
      color: gps.loading ? "#52525B" : gps.lat ? "#065F46" : "#991B1B"
    }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {gps.loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold">Acquiring mandatory GPS coordinates...</span>
            </>
          ) : gps.lat ? (
            <>
              <span className="text-[14px]">📍</span>
              <div>
                <span className="font-bold">GPS Location Captured</span>
                <span className="block text-[10px] opacity-75 font-mono">
                  Lat: {gps.lat.toFixed(5)}, Lng: {gps.lng!.toFixed(5)} (±{gps.accuracy?.toFixed(0)}m)
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="text-[14px]">⚠️</span>
              <div>
                <span className="font-bold">Location Required: </span>
                <span>{gps.error || "Please allow location access to record this delivery."}</span>
              </div>
            </>
          )}
        </div>
        {!gps.loading && (
          <button
            type="button"
            onClick={onRetry}
            className="px-2 py-1 rounded bg-white border font-bold text-[10px] uppercase shadow-sm transition hover:bg-zinc-50"
            style={{
              borderColor: gps.lat ? "#D1FAE5" : "#FCA5A5",
              color: gps.lat ? "#047857" : "#DC2626"
            }}
          >
            {gps.lat ? "Recapture" : "Retry GPS"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function MyDeliveriesClient({
  initialDeliveries,
  customers,
  products,
  userId,
  assignedVehicle,
  todayTrip,
}: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(initialDeliveries);
  
  const hasVehicleAssigned = !!assignedVehicle;
  const hasDeparted = !!todayTrip && !!todayTrip.departureTime;
  const isDeparted = hasVehicleAssigned && hasDeparted;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [form, setForm] = useState<DeliveryForm>({
    productId: "",
    deliveredQty: "0",
    returnedQty: "0",
    pendingQty: "1",
    emptyPending: "0",
    bookingQty: "1",
    cashCollected: "",
    creditAmount: "",
    paymentMode: "CASH",
    partialCollectionMode: "CASH",
    partialCollectionOther: "",
    notes: "",
    date: todayStr(),
    otherPaymentApp: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ── Delivery Proof Photos state ──────────────────────────────────────────────
  const [proofPhotos, setProofPhotos] = useState<{
    paymentReceiptUrl: string | null;
    customerCardUrl: string | null;
    additionalImageUrl: string | null;
  }>({ paymentReceiptUrl: null, customerCardUrl: null, additionalImageUrl: null });

  const [photoUploading, setPhotoUploading] = useState<{
    payment_receipt: boolean;
    customer_card: boolean;
    additional: boolean;
  }>({ payment_receipt: false, customer_card: false, additional: false });

  async function uploadProofPhoto(
    file: File,
    type: "payment_receipt" | "customer_card" | "additional"
  ) {
    setPhotoUploading((prev) => ({ ...prev, [type]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("deliveryId", "pending");
      fd.append("type", type);
      const res = await fetch("/api/upload-delivery-proof", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      const key = type === "payment_receipt"
        ? "paymentReceiptUrl"
        : type === "customer_card"
        ? "customerCardUrl"
        : "additionalImageUrl";
      setProofPhotos((prev) => ({ ...prev, [key]: data.url as string }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Photo upload failed. Try again.");
    } finally {
      setPhotoUploading((prev) => ({ ...prev, [type]: false }));
    }
  }

  const [gps, setGps] = useState<{
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
  }>({ lat: null, lng: null, accuracy: null, loading: false, error: null });

  const captureGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGps((prev) => ({ ...prev, error: "Geolocation not supported by browser.", loading: false }));
      return;
    }
    setGps((prev) => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        let msg = "Unable to retrieve location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location information unavailable. Verify GPS is active.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out.";
        }
        setGps((prev) => ({ ...prev, error: msg, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const todayDeliveries = deliveries.filter((d) => isToday(d.date));
  const pastDeliveries = deliveries.filter((d) => !isToday(d.date));

  const todayCylinders = todayDeliveries.reduce((a, d) => a + d.deliveredQty, 0);
  const todayTotals = todayDeliveries.reduce(
    (acc, d) => {
      const isDom = d.customer.type === "DOMESTIC";
      const isPartial = d.paymentMode === "PARTIAL";
      const isCredit = d.paymentMode === "CREDIT";
      const isCash = d.paymentMode === "CASH";
      const isOnline = ["PhonePe", "GPay", "Paytm", "Paybook", "Others"].includes(d.paymentMode);

      let cashVal = 0;
      let onlineVal = 0;
      let creditVal = 0;

      if (isCash) {
        cashVal = d.cashCollected;
      } else if (isCredit) {
        creditVal = d.creditAmount || 0;
      } else if (isPartial) {
        cashVal = d.cashCollected;
        if (isDom) {
          onlineVal = d.creditAmount || 0;
        } else {
          creditVal = d.creditAmount || 0;
        }
      } else if (isOnline) {
        onlineVal = d.cashCollected;
      }

      acc.cash += cashVal;
      acc.online += onlineVal;
      acc.udhari += creditVal;
      return acc;
    },
    { cash: 0, online: 0, udhari: 0 }
  );
  const todayPending = todayDeliveries.reduce((a, d) => a + d.pendingQty, 0);
  const todayCustomers = todayDeliveries.length;

  function openWizard() {
    setStep(1);
    setSelectedCustomer(null);
    setForm({ productId: "", deliveredQty: "0", returnedQty: "0", pendingQty: "1", emptyPending: "0", bookingQty: "1", cashCollected: "", creditAmount: "", paymentMode: "CASH", partialCollectionMode: "CASH", partialCollectionOther: "", notes: "", date: todayStr(), otherPaymentApp: "" });
    setFormError("");
    setGps({ lat: null, lng: null, accuracy: null, loading: false, error: null });
    setProofPhotos({ paymentReceiptUrl: null, customerCardUrl: null, additionalImageUrl: null });
    setPhotoUploading({ payment_receipt: false, customer_card: false, additional: false });
    setWizardOpen(true);
  }

  function goStep2() {
    if (!selectedCustomer) { setFormError("Please find and select a customer first."); return; }
    setFormError("");
    setStep(2);
    captureGps();
  }

  function goStep3() {
    if (!form.productId) { setFormError("Please select a product."); return; }
    if (!form.deliveredQty || Number(form.deliveredQty) < 0) { setFormError("Delivered quantity cannot be negative."); return; }
    if (Number(form.deliveredQty) === 0 && Number(form.pendingQty) === 0) { setFormError("Enter cylinders delivered or mark as pending."); return; }
    if (form.paymentMode === "Others" && !(form.otherPaymentApp || "").trim()) {
      setFormError("Please specify the payment app name.");
      return;
    }
    if (form.paymentMode === "Paybook" && (!form.cashCollected || Number(form.cashCollected) <= 0)) {
      setFormError("Please enter the amount paid with booking.");
      return;
    }
    if (form.paymentMode === "PARTIAL") {
      if (!Number(form.cashCollected) && !Number(form.creditAmount)) {
        setFormError("For partial payment, enter cash collected and/or credit amount.");
        return;
      }
      if (form.partialCollectionMode === "Others" && !form.partialCollectionOther.trim()) {
        setFormError("Please specify the app name for cash collection method.");
        return;
      }
    }
    // Photo validation — both mandatory photos required
    if (!proofPhotos.paymentReceiptUrl) {
      setFormError("📸 Payment Receipt photo is required. Please take a photo of the payment receipt.");
      return;
    }
    if (!proofPhotos.customerCardUrl) {
      setFormError("📋 Customer Card Entry photo is required. Please photograph the gas book entry.");
      return;
    }
    // Location check: Warn if GPS not captured yet
    if (!gps.lat && !gps.loading) {
      setFormError("Mandatory: We need to capture your GPS location. Click retry below.");
      captureGps();
      return;
    }
    if (gps.loading) {
      setFormError("Acquiring GPS location lock... Please wait.");
      return;
    }
    setFormError("");
    setStep(3);
  }

  function handleSubmit() {
    if (!selectedCustomer) return;
    if (!gps.lat && !gps.loading) {
      setFormError("GPS location is mandatory to submit delivery records. Attempting to capture...");
      captureGps();
      return;
    }
    if (gps.loading) {
      setFormError("Please wait for GPS coordinates to load.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("customerId", selectedCustomer.id);
    fd.append("productId", form.productId);
    fd.append("deliveredQty", form.deliveredQty);
    fd.append("returnedQty", form.returnedQty);
    fd.append("pendingQty", form.pendingQty);
    fd.append("cashCollected", form.cashCollected || "0");
    fd.append("creditAmount", form.creditAmount || "0");
    fd.append("paymentMode", form.paymentMode === "Others" ? (form.otherPaymentApp || "Others").trim() : form.paymentMode);
    fd.append("partialCollectionMode", form.partialCollectionMode === "Others" ? (form.partialCollectionOther || "Others").trim() : (form.partialCollectionMode || "CASH"));
    fd.append("notes", form.notes || "");
    fd.append("date", form.date);
    fd.append("deliveredById", userId);
    if (gps.lat) fd.append("deliveryLat", gps.lat.toString());
    if (gps.lng) fd.append("deliveryLng", gps.lng.toString());
    if (gps.accuracy) fd.append("deliveryAccuracy", gps.accuracy.toString());
    // ── Append proof photo URLs ──
    if (proofPhotos.paymentReceiptUrl) fd.append("paymentReceiptUrl", proofPhotos.paymentReceiptUrl);
    if (proofPhotos.customerCardUrl) fd.append("customerCardUrl", proofPhotos.customerCardUrl);
    if (proofPhotos.additionalImageUrl) fd.append("additionalImageUrl", proofPhotos.additionalImageUrl);

    startTransition(async () => {
      const res = await createDeliveryRecord(fd);
      setSubmitting(false);
      if ("error" in res && res.error) { setFormError(res.error); setStep(2); return; }
      if (res.delivery) {
        setDeliveries((prev) => [res.delivery as unknown as DeliveryRecord, ...prev]);
        setWizardOpen(false);
      }
    });
  }

  const selectedProduct = products.find((p) => p.id === form.productId);

  // Group past deliveries by date
  const pastByDate: Record<string, DeliveryRecord[]> = {};
  pastDeliveries.forEach((d) => {
    const key = fmtDate(d.date);
    if (!pastByDate[key]) pastByDate[key] = [];
    pastByDate[key].push(d);
  });

  return (
    <>
      {/* Vehicle banner */}
      {assignedVehicle && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ background: "#18181B", border: "1px solid #27272A" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(37,99,235,0.25)" }}>
            <Truck className="w-4 h-4" style={{ color: "#60A5FA" }} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#52525B" }}>
              Assigned Vehicle
            </p>
            <p className="text-[14px] font-bold font-mono" style={{ color: "#FFFFFF" }}>
              {assignedVehicle.vehicleNo}
              <span className="ml-2 font-normal text-[12px] font-sans" style={{ color: "#A1A1AA" }}>
                {assignedVehicle.vehicleName} · {assignedVehicle.vehicleType}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatsCard
          title="Delivered Today"
          value={todayCylinders}
          subtitle="Cylinders"
          icon={<Package className="w-4 h-4" />}
          color="blue"
        />
        <StatsCard
          title="Collected (Cash + Online)"
          value={formatCurrency(todayTotals.cash + todayTotals.online)}
          subtitle={`Cash: ${formatCurrency(todayTotals.cash)} | Online: ${formatCurrency(todayTotals.online)}`}
          icon={<Wallet className="w-4 h-4" />}
          color="green"
        />
        <StatsCard
          title="Pending"
          value={todayPending}
          subtitle="Need follow-up"
          icon={<Clock className="w-4 h-4" />}
          color={todayPending > 0 ? "orange" : "green"}
        />
        <StatsCard
          title="Customers"
          value={todayCustomers}
          subtitle="Visited today"
          icon={<Users className="w-4 h-4" />}
          color="purple"
        />
      </div>

      {/* Warning banner if not departed or vehicle not assigned */}
      {!isDeparted && (
        <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
          style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E" }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="text-[13px]">
            <p className="font-semibold">Delivery Feature Locked</p>
            <p className="mt-0.5 opacity-90">
              {!hasVehicleAssigned 
                ? "No vehicle is assigned to you today. Please contact your manager or godown keeper to assign a vehicle."
                : `Your assigned vehicle (${assignedVehicle.vehicleNo}) has not departed yet. Please ensure the godown keeper records the vehicle departure.`}
            </p>
          </div>
        </div>
      )}

      {/* Today header + Add button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>
            Today — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-[12px]" style={{ color: "#A1A1AA" }}>
            {todayDeliveries.length} delivery record{todayDeliveries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openWizard}
          disabled={!isDeparted}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#2563EB" }}
        >
          <Plus className="w-4 h-4" /> Add Delivery
        </button>
      </div>

      {/* Today's deliveries */}
      {todayDeliveries.length === 0 ? (
        <div className="rounded-xl py-14 flex flex-col items-center justify-center"
          style={{ background: "#FAFAFA", border: "1px dashed #D4D4D8" }}>
          <Truck className="w-10 h-10 mb-3" style={{ color: "#D4D4D8" }} />
          <p className="text-[14px] font-medium" style={{ color: "#71717A" }}>No deliveries recorded today</p>
          <p className="text-[12px] mt-1 mb-4" style={{ color: "#A1A1AA" }}>
            Tap &apos;Add Delivery&apos; and use the connection number to find a customer
          </p>
          <button 
            onClick={openWizard}
            disabled={!isDeparted}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#2563EB" }}
          >
            <Plus className="w-4 h-4" /> Add First Delivery
          </button>
        </div>
      ) : (
        <DeliveryTable deliveries={todayDeliveries} />
      )}

      {/* Past 7-day history */}
      {Object.keys(pastByDate).length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setHistoryExpanded((v) => !v)}
            className="flex items-center gap-2 text-[13px] font-medium mb-3 w-full text-left"
            style={{ color: "#52525B" }}
          >
            <CalendarDays className="w-4 h-4" style={{ color: "#A1A1AA" }} />
            Last 7 Days History
            <span className="ml-auto text-[11px]" style={{ color: "#A1A1AA" }}>
              {historyExpanded ? "Hide ▲" : "Show ▼"}
            </span>
          </button>
          {historyExpanded && (
            <div className="space-y-4">
              {Object.entries(pastByDate).map(([date, recs]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[12px] font-semibold" style={{ color: "#52525B" }}>{date}</span>
                    <div className="flex-1 h-px" style={{ background: "#E4E4E7" }} />
                    <span className="text-[11px]" style={{ color: "#A1A1AA" }}>
                      {recs.reduce((a, r) => a + r.deliveredQty, 0)} cyl · {(() => {
                        const totalColl = recs.reduce((acc, r) => {
                          const isDom = r.customer.type === "DOMESTIC";
                          const isPartial = r.paymentMode === "PARTIAL";
                          if (isPartial && isDom) {
                            return acc + r.cashCollected + (r.creditAmount || 0);
                          }
                          return acc + r.cashCollected;
                        }, 0);
                        return formatCurrency(totalColl);
                      })()}
                    </span>
                  </div>
                  <DeliveryTable deliveries={recs} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Wizard Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={step === 1 ? "Step 1 — Find Customer" : step === 2 ? "Step 2 — Delivery Details" : "Step 3 — Review & Confirm"}
        size="xl"
      >
        <div>
          {step === 1 && (
            <>
              <Step1FindCustomer
                customers={customers}
                selected={selectedCustomer}
                onSelect={(c) => {
                  setSelectedCustomer(c);
                  setFormError("");
                }}
              />
              {formError && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
                  <span className="text-[12px]" style={{ color: "#DC2626" }}>{formError}</span>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setWizardOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border"
                  style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={goStep2}
                  disabled={!selectedCustomer}
                  className="flex-2 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
                  style={{ background: "#2563EB", flex: 2 }}
                >
                  Next: Delivery Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && selectedCustomer && (
            <>
              <GpsStatusBox gps={gps} onRetry={captureGps} />
              <Step2DeliveryDetails
                customer={selectedCustomer}
                products={products}
                form={form}
                onChange={(f) => setForm((prev) => ({ ...prev, ...f }))}
                error={formError}
                proofPhotos={proofPhotos}
                photoUploading={photoUploading}
                onUploadPhoto={uploadProofPhoto}
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setStep(1); setFormError(""); }}
                  className="flex items-center gap-1 py-2.5 px-4 rounded-lg text-[13px] font-medium border"
                  style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={goStep3}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium text-white"
                  style={{ background: "#2563EB" }}>
                  Review Delivery <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 3 && selectedCustomer && (
            <>
              <GpsStatusBox gps={gps} onRetry={captureGps} />
              <Step3Review customer={selectedCustomer} form={form} product={selectedProduct} proofPhotos={proofPhotos} />
              {formError && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
                  <span className="text-[12px]" style={{ color: "#DC2626" }}>{formError}</span>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setStep(2); setFormError(""); }}
                  className="flex items-center gap-1 py-2.5 px-4 rounded-lg text-[13px] font-medium border"
                  style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
                  <ChevronLeft className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60 transition-opacity"
                  style={{ background: "#16A34A" }}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirm Delivery
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

// ─── Payment mode badge helper ────────────────────────────────────────────────

function PaymentBadge({ mode }: { mode: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    CASH: { label: "Cash", bg: "#F0FDF4", color: "#16A34A" },
    CREDIT: { label: "Udhari", bg: "#FEF3C7", color: "#B45309" },
    PARTIAL: { label: "Partial", bg: "#EFF6FF", color: "#1D4ED8" },
    PhonePe: { label: "PhonePe", bg: "#F5F3FF", color: "#7C3AED" },
    GPay: { label: "GPay", bg: "#F0FDF4", color: "#059669" },
    Paytm: { label: "Paytm", bg: "#EFF6FF", color: "#2563EB" },
    Paybook: { label: "Paybook", bg: "#ECFDF5", color: "#047857" },
  };
  const c = cfg[mode] ?? { label: mode, bg: "#F4F4F5", color: "#52525B" };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ─── Delivery table ───────────────────────────────────────────────────────────

function DeliveryTable({ deliveries, compact = false }: { deliveries: DeliveryRecord[]; compact?: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #E4E4E7" }}>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#71717A" }}>Customer</th>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#71717A" }}>Product</th>
              <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Delivered</th>
              <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Returned</th>
              <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Pending</th>
              <th className="px-4 py-2.5 text-right font-medium" style={{ color: "#71717A" }}>Cash</th>
              <th className="px-4 py-2.5 text-right font-medium" style={{ color: "#71717A" }}>Online</th>
              <th className="px-4 py-2.5 text-right font-medium" style={{ color: "#71717A" }}>Udhari</th>
              <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Mode</th>
              {!compact && <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Time</th>}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d, i) => {
              const isDom = d.customer.type === "DOMESTIC";
              const isPartial = d.paymentMode === "PARTIAL";
              const isCredit = d.paymentMode === "CREDIT";
              const isCash = d.paymentMode === "CASH";
              const isOnline = ["PhonePe", "GPay", "Paytm", "Paybook", "Others"].includes(d.paymentMode);

              let cashVal = 0;
              let onlineVal = 0;
              let creditVal = 0;

              if (isCash) {
                cashVal = d.cashCollected;
              } else if (isCredit) {
                creditVal = d.creditAmount || 0;
              } else if (isPartial) {
                cashVal = d.cashCollected;
                if (isDom) {
                  onlineVal = d.creditAmount || 0;
                } else {
                  creditVal = d.creditAmount || 0;
                }
              } else if (isOnline) {
                onlineVal = d.cashCollected;
              }

              return (
                <tr key={d.id}
                  style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "#18181B" }}>{d.customer.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px]" style={{ color: "#A1A1AA" }}>{d.customer.phone}</span>
                      {d.customer.customerCode && (
                        <span className="flex items-center gap-0.5 text-[11px] font-mono" style={{ color: "#2563EB" }}>
                          <Hash className="w-2.5 h-2.5" />{d.customer.customerCode}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={d.customer.type === "DOMESTIC"
                          ? { background: "#EFF6FF", color: "#2563EB" }
                          : { background: "#F5F3FF", color: "#7C3AED" }}
                      >
                        {d.customer.type === "DOMESTIC" ? "Regular" : "Commercial"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "#52525B" }}>{d.product.name}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "#2563EB" }}>{d.deliveredQty}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "#52525B" }}>{d.returnedQty || "—"}</td>
                  <td className="px-4 py-3 text-center font-medium"
                    style={{ color: d.pendingQty > 0 ? "#D97706" : "#A1A1AA" }}>
                    {d.pendingQty > 0 ? d.pendingQty : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: cashVal > 0 ? "#16A34A" : "#A1A1AA" }}>
                    {cashVal > 0 ? formatCurrency(cashVal) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: onlineVal > 0 ? "#7C3AED" : "#A1A1AA" }}>
                    {onlineVal > 0 ? formatCurrency(onlineVal) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: creditVal > 0 ? "#B45309" : "#A1A1AA" }}>
                    {creditVal > 0 ? formatCurrency(creditVal) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PaymentBadge mode={d.paymentMode || "CASH"} />
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-center text-[11px]" style={{ color: "#A1A1AA" }}>
                      {fmtTime(d.createdAt)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(() => {
              const totals = deliveries.reduce(
                (acc, d) => {
                  const isDom = d.customer.type === "DOMESTIC";
                  const isPartial = d.paymentMode === "PARTIAL";
                  const isCredit = d.paymentMode === "CREDIT";
                  const isCash = d.paymentMode === "CASH";
                  const isOnline = ["PhonePe", "GPay", "Paytm", "Paybook", "Others"].includes(d.paymentMode);

                  let cashVal = 0;
                  let onlineVal = 0;
                  let creditVal = 0;

                  if (isCash) {
                    cashVal = d.cashCollected;
                  } else if (isCredit) {
                    creditVal = d.creditAmount || 0;
                  } else if (isPartial) {
                    cashVal = d.cashCollected;
                    if (isDom) {
                      onlineVal = d.creditAmount || 0;
                    } else {
                      creditVal = d.creditAmount || 0;
                    }
                  } else if (isOnline) {
                    onlineVal = d.cashCollected;
                  }

                  acc.cash += cashVal;
                  acc.online += onlineVal;
                  acc.udhari += creditVal;
                  return acc;
                },
                { cash: 0, online: 0, udhari: 0 }
              );

              return (
                <tr style={{ background: "#F8F8F8", borderTop: "1px solid #E4E4E7" }}>
                  <td colSpan={2} className="px-4 py-2.5 text-[12px] font-semibold" style={{ color: "#52525B" }}>
                    Total ({deliveries.length} records)
                  </td>
                  <td className="px-4 py-2.5 text-center text-[12px] font-bold" style={{ color: "#2563EB" }}>
                    {deliveries.reduce((a, d) => a + d.deliveredQty, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[12px]" style={{ color: "#52525B" }}>
                    {deliveries.reduce((a, d) => a + d.returnedQty, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[12px] font-medium" style={{ color: "#D97706" }}>
                    {deliveries.reduce((a, d) => a + d.pendingQty, 0) || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold" style={{ color: "#16A34A" }}>
                    {totals.cash > 0 ? formatCurrency(totals.cash) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold" style={{ color: "#7C3AED" }}>
                    {totals.online > 0 ? formatCurrency(totals.online) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold" style={{ color: "#B45309" }}>
                    {totals.udhari > 0 ? formatCurrency(totals.udhari) : "—"}
                  </td>
                  <td />
                  {!compact && <td />}
                </tr>
              );
            })()}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
