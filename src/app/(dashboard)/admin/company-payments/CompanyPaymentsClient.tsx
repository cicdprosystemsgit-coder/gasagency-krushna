"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit, Calendar, DollarSign, Tag, Landmark, RefreshCw, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createCompanyPayment, updateCompanyPayment, deleteCompanyPayment, getCompanyPayments } from "@/app/actions/company-payments";
import { type CompanyPayment } from "@/generated/prisma";
import { toast } from "sonner";

interface PaymentWithRelations extends CompanyPayment {
  product?: { name: string } | null;
  addedBy: { name: string };
}

interface CompanyPaymentsClientProps {
  initialPayments: PaymentWithRelations[];
  products: { id: string; name: string }[];
  canEdit: boolean;
  userId: string;
}

export function CompanyPaymentsClient({
  initialPayments,
  products,
  canEdit,
  userId,
}: CompanyPaymentsClientProps) {
  const [payments, setPayments] = useState<PaymentWithRelations[]>(initialPayments);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    productId: "ALL",
    oilCompany: "ALL",
  });

  const [isPending, startTransition] = useTransition();
  const [isFiltering, startFilterTransition] = useTransition();
  const [error, setError] = useState("");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentWithRelations | null>(null);

  // Forms state
  const [form, setForm] = useState({
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

  // Calculate summaries based on filtered/fetched payments
  const totalPaidAllTime = payments.reduce((acc, p) => acc + p.amount, 0);
  
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const totalPaidThisMonth = payments
    .filter((p) => new Date(p.date) >= thisMonthStart)
    .reduce((acc, p) => acc + p.amount, 0);
  const totalPaidLastMonth = payments
    .filter((p) => new Date(p.date) >= lastMonthStart && new Date(p.date) < thisMonthStart)
    .reduce((acc, p) => acc + p.amount, 0);

  const averagePayment = payments.length > 0 ? totalPaidAllTime / payments.length : 0;

  // Build a 6-month trend from payments data
  const monthlyTrend = (() => {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, 0);
    }
    payments.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + p.amount);
    });
    return Array.from(map.entries()).map(([month, amount]) => ({
      label: new Date(month + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      amount: Math.round(amount),
    }));
  })();

  async function handleFilterChange(newFilters: typeof filters) {
    setFilters(newFilters);
    startFilterTransition(async () => {
      const res = await getCompanyPayments(newFilters);
      if (res.payments) {
        setPayments(res.payments as any);
      }
    });
  }

  function openAddModal() {
    setError("");
    setForm({
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
    setAddModalOpen(true);
  }

  function openEditModal(payment: PaymentWithRelations) {
    setError("");
    setActivePayment(payment);
    const payDate = new Date(payment.date);
    setForm({
      date: payDate.toISOString().split("T")[0],
      amount: payment.amount.toString(),
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo || "",
      invoiceNo: payment.invoiceNo || "",
      productId: payment.productId || "NONE",
      qtyCylinders: payment.qtyCylinders?.toString() || "",
      oilCompany: payment.oilCompany || "HP Gas",
      description: payment.description || "",
    });
    setEditModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date) { setError("Date is required"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Valid amount is required"); return; }
    
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await createCompanyPayment(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Payment recorded successfully");
      setAddModalOpen(false);
      // Trigger refresh filters to reload
      handleFilterChange(filters);
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!activePayment) return;
    if (!form.date) { setError("Date is required"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Valid amount is required"); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await updateCompanyPayment(activePayment.id, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Payment updated successfully");
      setEditModalOpen(false);
      handleFilterChange(filters);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteCompanyPayment(id);
      if (result.success) {
        toast.success("Payment record deleted");
        handleFilterChange(filters);
      } else {
        toast.error(result.error || "Failed to delete payment");
      }
    });
  }

  const paymentModeColors: Record<string, string> = {
    NEFT: "bg-indigo-50 text-indigo-700 border-indigo-100",
    RTGS: "bg-purple-50 text-purple-700 border-purple-100",
    IMPS: "bg-teal-50 text-teal-700 border-teal-100",
    UPI: "bg-green-50 text-green-700 border-green-100",
    CHEQUE: "bg-amber-50 text-amber-700 border-amber-100",
    BANK_TRANSFER: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className="space-y-6">
      {/* KPI summaries row — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">This Month</p>
            <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalPaidThisMonth)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Last Month</p>
            <h3 className="text-2xl font-bold text-slate-700">{formatCurrency(totalPaidLastMonth)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total Paid (Filtered)</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaidAllTime)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Avg / Payment</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(averagePayment)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly trend chart */}
      <div className="card p-5 space-y-3">
        <h4 className="text-sm font-bold text-slate-900">Monthly Payment Trend (Last 6 Months)</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Paid"]} />
              <Bar dataKey="amount" fill="#EF4444" name="Paid to Oil Co." radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and actions bar */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange({ ...filters, from: e.target.value })}
                className="input py-1.5 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange({ ...filters, to: e.target.value })}
                className="input py-1.5 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Product</label>
              <select
                value={filters.productId}
                onChange={(e) => handleFilterChange({ ...filters, productId: e.target.value })}
                className="input py-1.5 px-3 text-xs"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Oil Company</label>
              <select
                value={filters.oilCompany}
                onChange={(e) => handleFilterChange({ ...filters, oilCompany: e.target.value })}
                className="input py-1.5 px-3 text-xs"
              >
                <option value="ALL">All Companies</option>
                <option value="HP Gas">HP Gas</option>
                <option value="Indane">Indane</option>
                <option value="Bharat Gas">Bharat Gas</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 self-end md:self-auto">
            <button
              onClick={() => handleFilterChange({ from: "", to: "", productId: "ALL", oilCompany: "ALL" })}
              className="btn btn-secondary py-2 text-xs flex items-center gap-1.5"
              title="Reset Filters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFiltering ? "animate-spin" : ""}`} />
              Reset
            </button>
            {canEdit && (
              <button
                onClick={openAddModal}
                className="btn btn-primary py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main payments table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Oil Company</th>
                <th>Invoice / Bill No</th>
                <th>UTR / Reference</th>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
                <th>Mode</th>
                <th>Recorded By</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="py-14 text-center text-slate-400 text-xs">
                    No payment records found matching filters
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <td className="font-medium">{formatDate(p.date)}</td>
                    <td className="text-slate-800 font-semibold">{p.oilCompany || "N/A"}</td>
                    <td className="text-slate-600 font-mono text-xs">{p.invoiceNo || "-"}</td>
                    <td className="text-slate-600 font-mono text-xs">{p.referenceNo || "-"}</td>
                    <td>{p.product?.name || <span className="text-slate-400 italic">None / Mixed</span>}</td>
                    <td className="text-right font-medium">{p.qtyCylinders !== null ? p.qtyCylinders : "-"}</td>
                    <td className="text-right font-bold text-red-600">{formatCurrency(p.amount)}</td>
                    <td>
                      <span className={`badge border text-[10px] px-2 py-0.5 rounded-full ${paymentModeColors[p.paymentMode] || "badge-neutral"}`}>
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{p.addedBy.name}</td>
                    {canEdit && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Record Company Payment" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Oil Company *</label>
              <select
                value={form.oilCompany}
                onChange={(e) => setForm({ ...form, oilCompany: e.target.value })}
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
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
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
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">UTR / Txn Reference No.</label>
              <input
                type="text"
                placeholder="e.g. N123456789012"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Associated Cylinder Product</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
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
                value={form.qtyCylinders}
                onChange={(e) => setForm({ ...form, qtyCylinders: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Remarks</label>
            <textarea
              placeholder="Any additional notes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Company Payment" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Oil Company *</label>
              <select
                value={form.oilCompany}
                onChange={(e) => setForm({ ...form, oilCompany: e.target.value })}
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
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
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
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">UTR / Txn Reference No.</label>
              <input
                type="text"
                placeholder="e.g. UTR123456"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Associated Cylinder Product</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
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
                value={form.qtyCylinders}
                onChange={(e) => setForm({ ...form, qtyCylinders: e.target.value })}
                className="input focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Remarks</label>
            <textarea
              placeholder="Any additional notes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="input focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
