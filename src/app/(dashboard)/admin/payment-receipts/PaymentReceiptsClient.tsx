"use client";

import { useState, useTransition } from "react";
import { Receipt, Plus, X, DollarSign, CreditCard, Smartphone, Banknote, Trash2, FileText } from "lucide-react";
import { createPaymentReceipt, deletePaymentReceipt } from "@/app/actions/payment-receipts";
import { formatCurrency, formatDate } from "@/lib/utils";

type Customer = { id: string; name: string; phone: string; customerCode: string | null };
type ReceiptRecord = {
  id: string; receiptNo: string; amount: number; paymentMode: string;
  utrNo: string | null; date: string; notes: string | null;
  customer: { name: string; phone: string };
  collectedBy: { name: string };
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  UPI: <Smartphone className="w-3.5 h-3.5" />,
  BANK_TRANSFER: <CreditCard className="w-3.5 h-3.5" />,
  CHEQUE: <FileText className="w-3.5 h-3.5" />,
};

const PAYMENT_COLORS: Record<string, { bg: string; color: string }> = {
  CASH:          { bg: "#DCFCE7", color: "#15803D" },
  UPI:           { bg: "#DBEAFE", color: "#1D4ED8" },
  BANK_TRANSFER: { bg: "#F5F3FF", color: "#7C3AED" },
  CHEQUE:        { bg: "#FEF9C3", color: "#854D0E" },
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

  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    paymentMode: "CASH",
    utrNo: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const totalAmount = receipts.reduce((s, r) => s + r.amount, 0);

  const handleSubmit = () => {
    if (!form.customerId || !form.amount || !form.date) {
      setError("Customer, amount and date are required");
      return;
    }
    startTransition(async () => {
      const result = await createPaymentReceipt({
        customerId: form.customerId,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Payment Receipts</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Track and generate customer payment receipts</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Receipt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>Total Collected</p>
          <p className="text-[18px] font-bold" style={{ color: "#16A34A" }}>{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>Total Receipts</p>
          <p className="text-[18px] font-bold" style={{ color: "#18181B" }}>{receipts.length}</p>
        </div>
        {["CASH", "UPI"].map((mode) => (
          <div key={mode} className="card p-4">
            <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>{mode} Collected</p>
            <p className="text-[18px] font-bold" style={{ color: "#18181B" }}>
              {formatCurrency(receipts.filter((r) => r.paymentMode === mode).reduce((s, r) => s + r.amount, 0))}
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
                <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.customerCode ? `(${c.customerCode})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Amount (₹) *</label>
                <input className="input" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Payment Mode *</label>
                <select className="input" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  {["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"].map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Date *</label>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              {["UPI", "BANK_TRANSFER"].includes(form.paymentMode) && (
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>UTR / Reference No</label>
                  <input className="input" value={form.utrNo} onChange={(e) => setForm({ ...form, utrNo: e.target.value })} placeholder="Transaction reference…" />
                </div>
              )}
              <div className={["UPI", "BANK_TRANSFER"].includes(form.paymentMode) ? "" : "sm:col-span-2"}>
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
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                  No receipts yet. Create the first one.
                </td>
              </tr>
            ) : receipts.map((r) => {
              const modeCfg = PAYMENT_COLORS[r.paymentMode] ?? { bg: "#F4F4F5", color: "#52525B" };
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
                      {PAYMENT_ICONS[r.paymentMode]} {r.paymentMode.replace(/_/g, " ")}
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
    </div>
  );
}
