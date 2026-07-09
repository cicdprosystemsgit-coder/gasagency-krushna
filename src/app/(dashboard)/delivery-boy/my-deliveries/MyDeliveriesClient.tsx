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
  AlertCircle, Check,
} from "lucide-react";
import { createDeliveryRecord } from "@/app/actions/deliveries";

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
  status: string;
  notes: string | null;
  customer: { name: string; phone: string; address: string | null; type: string; customerCode: string | null };
  product: { name: string; saleRate: number };
}

interface AssignedVehicle {
  vehicleNo: string;
  vehicleName: string;
  vehicleType: string;
}

interface Props {
  initialDeliveries: DeliveryRecord[];
  customers: CustomerRecord[];
  products: ProductRecord[];
  userId: string;
  assignedVehicle?: AssignedVehicle | null;
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
  cashCollected: string;
  paymentMode: string;
  notes: string;
  date: string;
  otherPaymentApp?: string;
}

function Step2DeliveryDetails({
  customer,
  products,
  form,
  onChange,
  error,
}: {
  customer: CustomerRecord;
  products: ProductRecord[];
  form: DeliveryForm;
  onChange: (f: Partial<DeliveryForm>) => void;
  error: string;
}) {
  const selectedProduct = products.find((p) => p.id === form.productId);

  return (
    <div>
      <StepIndicator step={2} />

      {/* Customer reminder strip */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0"
          style={{ background: customer.type === "DOMESTIC" ? "#2563EB" : "#7C3AED" }}>
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

      <div className="space-y-4">
        {/* Date + Product */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelSty}>Delivery Date *</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
              <input
                type="date"
                value={form.date}
                onChange={(e) => onChange({ date: e.target.value })}
                className={inputCls}
                style={{ ...inputSty, paddingLeft: "2.25rem" }}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelSty}>Product / Cylinder *</label>
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
        </div>

        {/* Cylinder quantities */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>
            Cylinder Count
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Delivered", key: "deliveredQty" as const, color: "#2563EB", hint: "Full cylinders given" },
              { label: "Empty Returned", key: "returnedQty" as const, color: "#16A34A", hint: "Empty cylinders collected" },
              { label: "Pending", key: "pendingQty" as const, color: "#D97706", hint: "Not delivered (absent etc.)" },
            ].map(({ label, key, color, hint }) => (
              <div key={key}>
                <label className="block text-[11px] font-medium mb-1" style={{ color }}>{label}</label>
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-[15px] font-bold text-center border outline-none transition-colors focus:border-blue-500"
                  style={{ borderColor: "#D4D4D8", background: "#FFFFFF", color }}
                />
                <p className="text-[10px] mt-1 text-center" style={{ color: "#A1A1AA" }}>{hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cash + payment mode */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>
            Payment
          </p>

          {/* CREDIT mode banner */}
          {form.paymentMode === "CREDIT" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
              <span className="text-[13px] flex-shrink-0">⚠️</span>
              <p className="text-[11px] font-medium" style={{ color: "#92400E" }}>
                <strong>Credit (Udhari)</strong> selected — the amount below will be automatically added to this customer&apos;s Credit Ledger as money owed. Enter the total cylinder value.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelSty}>
                {form.paymentMode === "CREDIT" ? "Credit Amount (₹) *" : "Cash Collected (₹)"}
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cashCollected}
                  onChange={(e) => onChange({ cashCollected: e.target.value })}
                  placeholder={form.paymentMode === "CREDIT" ? "Enter total value of cylinders" : "0.00"}
                  className={inputCls}
                  style={{
                    ...inputSty,
                    paddingLeft: "2.25rem",
                    ...(form.paymentMode === "CREDIT" ? { borderColor: "#F59E0B", background: "#FFFBEB" } : {}),
                  }}
                />
              </div>
              {selectedProduct && selectedProduct.saleRate > 0 && (
                <p className="text-[11px] mt-1" style={{ color: form.paymentMode === "CREDIT" ? "#92400E" : "#A1A1AA" }}>
                  {form.paymentMode === "CREDIT" ? "📋 " : ""}Rate: ₹{selectedProduct.saleRate} × {form.deliveredQty || 0} = ₹{(selectedProduct.saleRate * (Number(form.deliveredQty) || 0)).toFixed(0)}
                  {form.paymentMode === "CREDIT" ? " (auto-used if left blank)" : ""}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls} style={labelSty}>Payment Mode</label>
              <div className="flex flex-col gap-2 pt-1">
                {[
                  { val: "CASH", label: "Cash" },
                  { val: "PhonePe", label: "PhonePe" },
                  { val: "GPay", label: "GPay" },
                  { val: "Paytm", label: "Paytm" },
                  { val: "CREDIT", label: "Credit (Pending)" },
                  { val: "Others", label: "Others" },
                ].map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                      style={form.paymentMode === val
                        ? { borderColor: "#2563EB", background: "#2563EB" }
                        : { borderColor: "#D4D4D8" }}
                      onClick={() => onChange({ paymentMode: val })}
                    >
                      {form.paymentMode === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-[12px]" style={{ color: "#52525B" }}>{label}</span>
                  </label>
                ))}
              </div>
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
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls} style={labelSty}>Notes (optional)</label>
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
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────

function Step3Review({
  customer,
  form,
  product,
}: {
  customer: CustomerRecord;
  form: DeliveryForm;
  product: ProductRecord | undefined;
}) {
  const isDomestic = customer.type === "DOMESTIC";
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
    { label: "Delivered", value: `${form.deliveredQty} cylinder${Number(form.deliveredQty) !== 1 ? "s" : ""}`, highlight: true },
    Number(form.returnedQty) > 0 ? { label: "Empty Returned", value: `${form.returnedQty} empty cylinder${Number(form.returnedQty) !== 1 ? "s" : ""}` } : null,
    Number(form.pendingQty) > 0 ? { label: "Pending", value: `${form.pendingQty} not delivered`, warn: true } : null,
    { label: "Cash Collected", value: `₹${Number(form.cashCollected || 0).toFixed(2)}`, highlight: true },
    {
      label: "Payment Mode",
      value: form.paymentMode === "CASH"
        ? "Cash"
        : form.paymentMode === "CREDIT"
          ? "Credit (Pending)"
          : form.paymentMode === "Others"
            ? (form.otherPaymentApp || "Others")
            : form.paymentMode
    },
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
}: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(initialDeliveries);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [form, setForm] = useState<DeliveryForm>({
    productId: "",
    deliveredQty: "1",
    returnedQty: "0",
    pendingQty: "0",
    cashCollected: "",
    paymentMode: "CASH",
    notes: "",
    date: todayStr(),
    otherPaymentApp: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const todayDeliveries = deliveries.filter((d) => isToday(d.date));
  const pastDeliveries = deliveries.filter((d) => !isToday(d.date));

  const todayCylinders = todayDeliveries.reduce((a, d) => a + d.deliveredQty, 0);
  const todayCash = todayDeliveries.reduce((a, d) => a + d.cashCollected, 0);
  const todayPending = todayDeliveries.reduce((a, d) => a + d.pendingQty, 0);
  const todayCustomers = todayDeliveries.length;

  function openWizard() {
    setStep(1);
    setSelectedCustomer(null);
    setForm({ productId: "", deliveredQty: "1", returnedQty: "0", pendingQty: "0", cashCollected: "", paymentMode: "CASH", notes: "", date: todayStr(), otherPaymentApp: "" });
    setFormError("");
    setWizardOpen(true);
  }

  function goStep2() {
    if (!selectedCustomer) { setFormError("Please find and select a customer first."); return; }
    setFormError("");
    setStep(2);
  }

  function goStep3() {
    if (!form.productId) { setFormError("Please select a product."); return; }
    if (!form.deliveredQty || Number(form.deliveredQty) < 0) { setFormError("Delivered quantity cannot be negative."); return; }
    if (Number(form.deliveredQty) === 0 && Number(form.pendingQty) === 0) { setFormError("Enter cylinders delivered or mark as pending."); return; }
    if (form.paymentMode === "Others" && !(form.otherPaymentApp || "").trim()) {
      setFormError("Please specify the payment app name.");
      return;
    }
    setFormError("");
    setStep(3);
  }

  function handleSubmit() {
    if (!selectedCustomer) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append("customerId", selectedCustomer.id);
    fd.append("productId", form.productId);
    fd.append("deliveredQty", form.deliveredQty);
    fd.append("returnedQty", form.returnedQty);
    fd.append("pendingQty", form.pendingQty);
    fd.append("cashCollected", form.cashCollected || "0");
    fd.append("paymentMode", form.paymentMode === "Others" ? (form.otherPaymentApp || "Others").trim() : form.paymentMode);
    fd.append("notes", form.notes || "");
    
    fd.append("date", form.date);
    fd.append("deliveredById", userId);
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
          title="Cash Collected"
          value={formatCurrency(todayCash)}
          subtitle="Today"
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
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
          <button onClick={openWizard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
            style={{ background: "#2563EB" }}>
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
                      {recs.reduce((a, r) => a + r.deliveredQty, 0)} cyl · {formatCurrency(recs.reduce((a, r) => a + r.cashCollected, 0))}
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
              <Step2DeliveryDetails
                customer={selectedCustomer}
                products={products}
                form={form}
                onChange={(f) => setForm((prev) => ({ ...prev, ...f }))}
                error={formError}
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
              <Step3Review customer={selectedCustomer} form={form} product={selectedProduct} />
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
              {!compact && <th className="px-4 py-2.5 text-center font-medium" style={{ color: "#71717A" }}>Time</th>}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d, i) => (
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
                <td className="px-4 py-3 text-right font-semibold" style={{ color: "#16A34A" }}>
                  {formatCurrency(d.cashCollected)}
                </td>
                {!compact && (
                  <td className="px-4 py-3 text-center text-[11px]" style={{ color: "#A1A1AA" }}>
                    {fmtTime(d.createdAt)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
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
                {formatCurrency(deliveries.reduce((a, d) => a + d.cashCollected, 0))}
              </td>
              {!compact && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
