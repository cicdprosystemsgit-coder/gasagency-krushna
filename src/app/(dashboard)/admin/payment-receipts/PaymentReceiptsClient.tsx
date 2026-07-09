"use client";

import { useState, useTransition } from "react";
import { Receipt, Plus, X, DollarSign, CreditCard, Smartphone, Banknote, Trash2, FileText } from "lucide-react";
import { createPaymentReceipt, deletePaymentReceipt } from "@/app/actions/payment-receipts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { createCustomer } from "@/app/actions/customers";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

type Customer = { id: string; name: string; phone: string; customerCode: string | null };
type ReceiptRecord = {
  id: string; receiptNo: string; amount: number; paymentMode: string;
  utrNo: string | null; date: string; notes: string | null;
  customer: { name: string; phone: string };
  collectedBy: { name: string };
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  Cash: <Banknote className="w-3.5 h-3.5" />,
  PhonePe: <Smartphone className="w-3.5 h-3.5" />,
  GPay: <Smartphone className="w-3.5 h-3.5" />,
  Paytm: <Smartphone className="w-3.5 h-3.5" />,
  UPI: <Smartphone className="w-3.5 h-3.5" />,
  BANK_TRANSFER: <CreditCard className="w-3.5 h-3.5" />,
  CHEQUE: <FileText className="w-3.5 h-3.5" />,
};

const PAYMENT_COLORS: Record<string, { bg: string; color: string }> = {
  CASH:          { bg: "#DCFCE7", color: "#15803D" },
  Cash:          { bg: "#DCFCE7", color: "#15803D" },
  PhonePe:       { bg: "#DBEAFE", color: "#1D4ED8" },
  GPay:          { bg: "#DBEAFE", color: "#1D4ED8" },
  Paytm:         { bg: "#DBEAFE", color: "#1D4ED8" },
  UPI:           { bg: "#DBEAFE", color: "#1D4ED8" },
  BANK_TRANSFER: { bg: "#F5F3FF", color: "#7C3AED" },
  CHEQUE:        { bg: "#FEF9C3", color: "#854D0E" },
};

const getModeIcon = (mode: string) => {
  return PAYMENT_ICONS[mode] || PAYMENT_ICONS[mode.toUpperCase()] || <Smartphone className="w-3.5 h-3.5" />;
};

const getModeColor = (mode: string) => {
  return PAYMENT_COLORS[mode] || PAYMENT_COLORS[mode.toUpperCase()] || { bg: "#DBEAFE", color: "#1D4ED8" };
};

const getPaymentModeDisplay = (mode: string) => {
  if (mode === "CASH") return "Cash";
  return mode;
};

type Props = {
  receipts: ReceiptRecord[];
  customers: Customer[];
  role: string;
};

export function PaymentReceiptsClient({ receipts: initial, customers, role }: Props) {
  const [receipts, setReceipts] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [otherPaymentApp, setOtherPaymentApp] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    paymentMode: "CASH",
    utrNo: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [localCustomers, setLocalCustomers] = useState(customers);
  const [quickCustomerModal, setQuickCustomerModal] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "", address: "", type: "DOMESTIC", email: "", customerCode: "" });
  const [quickError, setQuickError] = useState("");

  function handleQuickCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    if (!quickCustomerForm.name.trim()) { setQuickError("Name is required"); return; }
    if (!quickCustomerForm.phone.trim()) { setQuickError("Phone is required"); return; }

    const fd = new FormData();
    fd.append("name", quickCustomerForm.name);
    fd.append("phone", quickCustomerForm.phone);
    if (quickCustomerForm.address) fd.append("address", quickCustomerForm.address);
    fd.append("type", quickCustomerForm.type);
    if (quickCustomerForm.email) fd.append("email", quickCustomerForm.email);
    if (quickCustomerForm.customerCode) fd.append("customerCode", quickCustomerForm.customerCode);

    startTransition(async () => {
      const res = await createCustomer(fd);
      if (res.error) { setQuickError(res.error); return; }
      if (res.customer) {
        const newCust = {
          id: (res.customer as any).id,
          name: (res.customer as any).name,
          phone: (res.customer as any).phone,
          customerCode: (res.customer as any).customerCode
        };
        setLocalCustomers(prev => [...prev, newCust]);
        setForm(prev => ({ ...prev, customerId: newCust.id }));
        setQuickCustomerModal(false);
        setQuickCustomerForm({ name: "", phone: "", address: "", type: "DOMESTIC", email: "", customerCode: "" });
      }
    });
  }

  const filteredReceipts = receipts.filter((r) => {
    const rDate = new Date(r.date);
    rDate.setHours(0, 0, 0, 0);
    if (dateFrom && rDate < new Date(dateFrom)) return false;
    if (dateTo && rDate > new Date(dateTo)) return false;
    return true;
  });

  const totalAmount = filteredReceipts.reduce((s, r) => s + r.amount, 0);

  const handleSubmit = () => {
    if (!form.customerId || !form.amount || !form.date) {
      setError("Customer, amount and date are required");
      return;
    }
    const finalPaymentMode = form.paymentMode === "Others" ? otherPaymentApp.trim() : form.paymentMode;
    if (form.paymentMode === "Others" && !otherPaymentApp.trim()) {
      setError("Please specify the payment app name");
      return;
    }

    startTransition(async () => {
      const result = await createPaymentReceipt({
        customerId: form.customerId,
        amount: Number(form.amount),
        paymentMode: finalPaymentMode,
        utrNo: form.utrNo || undefined,
        date: form.date,
        notes: form.notes || undefined,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("receipt" in result && result.receipt) {
        setReceipts((prev) => [result.receipt as unknown as ReceiptRecord, ...prev]);
        setShowForm(false);
        setForm({ customerId: "", amount: "", paymentMode: "CASH", utrNo: "", date: new Date().toISOString().split("T")[0], notes: "" });
        setOtherPaymentApp("");
        setError(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deletePaymentReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Payment Receipts</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Track and generate customer payment receipts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Receipt
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>Total Collected</p>
          <p className="text-[18px] font-bold" style={{ color: "#16A34A" }}>{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>Total Receipts</p>
          <p className="text-[18px] font-bold" style={{ color: "#18181B" }}>{filteredReceipts.length}</p>
        </div>
        {["CASH", "UPI"].map((mode) => (
          <div key={mode} className="card p-4">
            <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>{mode} Collected</p>
            <p className="text-[18px] font-bold" style={{ color: "#18181B" }}>
              {formatCurrency(
                mode === "CASH"
                  ? filteredReceipts.filter((r) => r.paymentMode.toUpperCase() === "CASH").reduce((s, r) => s + r.amount, 0)
                  : filteredReceipts.filter((r) => r.paymentMode.toUpperCase() !== "CASH" && r.paymentMode.toUpperCase() !== "BANK_TRANSFER" && r.paymentMode.toUpperCase() !== "CHEQUE").reduce((s, r) => s + r.amount, 0)
              )}
            </p>
          </div>
        ))}
      </div>

      {/* New Receipt Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-section flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>New Payment Receipt</p>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Customer *</label>
                <div className="flex gap-2">
                  <select className="input flex-1" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">Select customer…</option>
                    {localCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.customerCode ? `(${c.customerCode})` : ""}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setQuickError(""); setQuickCustomerModal(true); }}
                    className="px-3 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors font-bold text-lg"
                    title="Add new customer"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Amount (₹) *</label>
                <input className="input" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Payment Mode *</label>
                <select className="input" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="GPay">GPay</option>
                  <option value="Paytm">Paytm</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              {form.paymentMode === "Others" && (
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Specify Payment App *</label>
                  <input
                    className="input"
                    type="text"
                    required
                    value={otherPaymentApp}
                    onChange={(e) => setOtherPaymentApp(e.target.value)}
                    placeholder="Enter payment app name..."
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="block text-[12px] font-medium" style={{ color: "#52525B" }}>Date *</label>
                <CalendarPicker value={form.date} onChange={(val) => setForm({ ...form, date: val })} />
              </div>
              {form.paymentMode !== "CASH" && (
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>UTR / Reference No</label>
                  <input className="input" value={form.utrNo} onChange={(e) => setForm({ ...form, utrNo: e.target.value })} placeholder="Transaction reference…" />
                </div>
              )}
              <div className={form.paymentMode !== "CASH" ? "" : "sm:col-span-2"}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
                <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional note…" />
              </div>
            </div>
            {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary">
                {isPending ? "Saving…" : "Create Receipt"}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-section">
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>All Receipts</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Date</th>
              <th>Collected By</th>
              <th>UTR</th>
              {role === "ADMIN" && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                  No receipts found for the selected date range.
                </td>
              </tr>
            ) : filteredReceipts.map((r) => {
              const modeCfg = getModeColor(r.paymentMode);
              return (
                <tr key={r.id}>
                  <td>
                    <span className="font-mono text-[12px] font-semibold" style={{ color: "#2563EB" }}>{r.receiptNo}</span>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-[13px]">{r.customer?.name ?? "—"}</p>
                      <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{r.customer?.phone ?? ""}</p>
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold text-[14px]" style={{ color: "#16A34A" }}>{formatCurrency(r.amount)}</span>
                  </td>
                  <td>
                    <span className="badge flex items-center gap-1 w-fit" style={{ background: modeCfg.bg, color: modeCfg.color }}>
                      {getModeIcon(r.paymentMode)} {getPaymentModeDisplay(r.paymentMode)}
                    </span>
                  </td>
                  <td className="text-[12px] muted">{formatDate(new Date(r.date))}</td>
                  <td className="text-[12px] muted">{r.collectedBy?.name ?? "—"}</td>
                  <td className="text-[12px] muted font-mono">{r.utrNo ?? "—"}</td>
                  {role === "ADMIN" && (
                    <td>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-zinc-300 hover:text-red-500 transition-colors"
                        title="Delete receipt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal open={quickCustomerModal} onClose={() => setQuickCustomerModal(false)} title="Quick Add Customer" size="sm">
        <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
          {quickError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{quickError}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label>
            <input
              type="text"
              required
              value={quickCustomerForm.name}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number *</label>
            <input
              type="tel"
              required
              value={quickCustomerForm.phone}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Type</label>
              <select
                value={quickCustomerForm.type}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DOMESTIC">Domestic</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Code</label>
              <input
                type="text"
                value={quickCustomerForm.customerCode}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, customerCode: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
            <textarea
              value={quickCustomerForm.address}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, address: e.target.value })}
              placeholder="Optional address details"
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickCustomerModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
