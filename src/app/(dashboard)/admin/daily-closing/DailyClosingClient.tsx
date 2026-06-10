"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { createDailyClosing, approveDailyClosing } from "@/app/actions/daily-closing";

interface Closing {
  id: string;
  date: Date | string;
  totalDeliveries: number;
  totalCollection: number;
  pendingDeliveries: number;
  returnedCylinders: number;
  cashOnHand: number;
  notes: string | null;
  status: string;
  managerApprovedAt: Date | string | null;
  adminApprovedAt: Date | string | null;
}

interface DailyClosingClientProps {
  initialClosings: Closing[];
  role: string;
}

export function DailyClosingClient({ initialClosings, role }: DailyClosingClientProps) {
  const [closings, setClosings] = useState(initialClosings);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    totalDeliveries: "",
    totalCollection: "",
    pendingDeliveries: "",
    returnedCylinders: "",
    cashOnHand: "",
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.totalDeliveries) { setError("Total deliveries is required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await createDailyClosing(fd);
      if (result.error) { setError(result.error); return; }
      if (result.closing) {
        setClosings((prev) => [result.closing!, ...prev]);
        setModalOpen(false);
        setForm({ date: new Date().toISOString().slice(0, 10), totalDeliveries: "", totalCollection: "", pendingDeliveries: "", returnedCylinders: "", cashOnHand: "", notes: "" });
      }
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approveDailyClosing(id, role);
      if (result.success) {
        setClosings((prev) => prev.map((c) => c.id === id ? { ...c, status: "APPROVED" } : c));
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">{closings.length} closing records</span>
        <button
          onClick={() => { setError(""); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
        >
          <Plus className="w-4 h-4" /> Add Daily Closing
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Deliveries</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Collection</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Pending</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Returned</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Cash on Hand</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Notes</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {closings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">No daily closing records yet</p>
                  </td>
                </tr>
              ) : closings.map((c) => (
                <tr key={c.id} className="table-row border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{formatDate(c.date)}</td>
                  <td className="px-5 py-3 text-center font-bold text-blue-700">{c.totalDeliveries}</td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">{formatCurrency(c.totalCollection)}</td>
                  <td className="px-5 py-3 text-center text-orange-600">{c.pendingDeliveries}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{c.returnedCylinders}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{formatCurrency(c.cashOnHand)}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-32 truncate">{c.notes ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    {c.status === "PENDING" && (
                      <button onClick={() => handleApprove(c.id)} disabled={isPending} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 mx-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Daily Closing" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Deliveries *</label>
              <input type="number" min="0" value={form.totalDeliveries} onChange={(e) => setForm({ ...form, totalDeliveries: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Collection (₹)</label>
              <input type="number" min="0" value={form.totalCollection} onChange={(e) => setForm({ ...form, totalCollection: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pending Deliveries</label>
              <input type="number" min="0" value={form.pendingDeliveries} onChange={(e) => setForm({ ...form, pendingDeliveries: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Returned Cylinders</label>
              <input type="number" min="0" value={form.returnedCylinders} onChange={(e) => setForm({ ...form, returnedCylinders: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cash on Hand (₹)</label>
            <input type="number" min="0" value={form.cashOnHand} onChange={(e) => setForm({ ...form, cashOnHand: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any end-of-day notes..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">
              {isPending ? "Saving..." : "Save Closing"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
