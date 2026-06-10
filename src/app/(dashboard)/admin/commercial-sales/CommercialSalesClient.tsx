"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, ShoppingCart, Trash2, Pencil } from "lucide-react";
import { createCommercialSale, deleteCommercialSale } from "@/app/actions/commercial-sales";
import type { Customer, Product } from "@/generated/prisma";

interface Sale {
  id: string;
  date: Date | string;
  qty: number;
  rate: number;
  amount: number;
  cashCollected: number;
  udhariNew: number;
  udhariPrev: number;
  balance: number;
  customer: { name: string; type: string };
  product: { name: string };
  addedBy: { name: string };
}

interface CommercialSalesClientProps {
  initialSales: Sale[];
  customers: Customer[];
  products: Product[];
  canEdit: boolean;
  userId: string;
}

export function CommercialSalesClient({ initialSales, customers, products, canEdit, userId }: CommercialSalesClientProps) {
  const [sales, setSales] = useState(initialSales);
  const [modalOpen, setModalOpen] = useState(false);
  const [addCustomerModal, setAddCustomerModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    customerId: "", productId: "", qty: "1", rate: "",
    cashCollected: "", udhariPrev: "0", remarks: "",
  });

  const dayTotal = sales
    .filter((s) => new Date(s.date).toDateString() === new Date(selectedDate).toDateString())
    .reduce((a, s) => a + s.amount, 0);

  function handleRateFromProduct(productId: string) {
    const p = products.find((p) => p.id === productId);
    if (p) setForm((f) => ({ ...f, productId, rate: String(p.saleRate) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) { setError("Please select a customer"); return; }
    if (!form.productId) { setError("Please select a product"); return; }
    if (!form.qty || Number(form.qty) <= 0) { setError("Quantity must be greater than 0"); return; }
    if (!form.rate || Number(form.rate) <= 0) { setError("Rate must be greater than 0"); return; }

    const qty = Number(form.qty);
    const rate = Number(form.rate);
    const amount = qty * rate;
    const cashCollected = Number(form.cashCollected) || 0;
    const udhariPrev = Number(form.udhariPrev) || 0;
    const udhariNew = amount - cashCollected;
    const balance = udhariPrev + udhariNew;

    const fd = new FormData();
    fd.append("customerId", form.customerId);
    fd.append("productId", form.productId);
    fd.append("qty", String(qty));
    fd.append("rate", String(rate));
    fd.append("amount", String(amount));
    fd.append("cashCollected", String(cashCollected));
    fd.append("udhariNew", String(udhariNew));
    fd.append("udhariPrev", String(udhariPrev));
    fd.append("balance", String(balance));
    fd.append("date", selectedDate);
    fd.append("addedById", userId);

    startTransition(async () => {
      const result = await createCommercialSale(fd);
      if (result.error) { setError(result.error); return; }
      if (result.sale) {
        setSales((prev) => [result.sale!, ...prev]);
        setModalOpen(false);
        setForm({ customerId: "", productId: "", qty: "1", rate: "", cashCollected: "", udhariPrev: "0", remarks: "" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this entry?")) return;
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result = await deleteCommercialSale(fd);
      if (result.success) setSales((prev) => prev.filter((s) => s.id !== id));
    });
  }

  const filteredSales = sales.filter(
    (s) => new Date(s.date).toDateString() === new Date(selectedDate).toDateString()
  );

  return (
    <>
      {/* Date + Totals bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">DATE</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="pl-4 border-l border-slate-100">
            <p className="text-xs text-slate-500">Total Customers</p>
            <p className="text-2xl font-bold text-slate-800">{filteredSales.length}</p>
          </div>
          <div className="pl-4 border-l border-slate-100">
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(dayTotal)}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setError(""); setModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Customer Sales — {formatDate(selectedDate)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate (₹)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Cash Collected</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Udhari (NEW)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Udhari (PRE)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Balance</th>
                {canEdit && <th className="px-4 py-3 text-center font-semibold text-slate-600">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-4 py-14 text-center">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400 text-sm">No commercial sales for this date</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="table-row border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.product.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700">{s.qty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(s.rate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(s.amount)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{formatCurrency(s.cashCollected)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(s.udhariNew)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(s.udhariPrev)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(s.balance)}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(s.id)}
                          title="Delete entry"
                          className="btn-action btn-action-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {filteredSales.length > 0 && (
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Total</td>
                  <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(filteredSales.reduce((a, s) => a + s.amount, 0))}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(filteredSales.reduce((a, s) => a + s.cashCollected, 0))}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(filteredSales.reduce((a, s) => a + s.udhariNew, 0))}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-red-700">{formatCurrency(filteredSales.reduce((a, s) => a + s.balance, 0))}</td>
                  {canEdit && <td></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Commercial Sale" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Customer *</label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="input"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Product *</label>
              <select
                value={form.productId}
                onChange={(e) => handleRateFromProduct(e.target.value)}
                className="input"
              >
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Quantity *</label>
              <input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Rate (₹) *</label>
              <input type="number" min="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Cash Collected (₹)</label>
              <input type="number" min="0" value={form.cashCollected} onChange={(e) => setForm({ ...form, cashCollected: e.target.value })} placeholder="0" className="input" />
            </div>
          </div>
          {form.qty && form.rate && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-800">{formatCurrency(Number(form.qty) * Number(form.rate))}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">New Udhari:</span>
                <span className="font-bold text-orange-600">{formatCurrency(Math.max(0, (Number(form.qty) * Number(form.rate)) - (Number(form.cashCollected) || 0)))}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Saving..." : "Save Sale"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
