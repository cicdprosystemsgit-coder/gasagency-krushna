"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { SelectWithAdd, type SelectOption } from "@/components/ui/SelectWithAdd";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { createOfficeTransaction, deleteOfficeTransaction } from "@/app/actions/office-transactions";
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
}
const getPaymentModeDisplay = (mode: string) => {
  if (mode === "CASH") return "Cash";
  if (mode === "ONLINE") return "Online";
  if (mode === "CREDIT") return "Credit";
  return mode;
};
const TABS = ["Inventory", "Cylinder / Gas New Connection"] as const;

interface OfficeTransactionsClientProps {
  initialTransactions: Transaction[];
  products: Product[];
  userId: string;
  canEdit: boolean;
}

const INVENTORY_TYPE_OPTIONS: SelectOption[] = [
  { value: "OTHER",     label: "Other Inventory" },
  { value: "REGULATOR", label: "Regulator" },
  { value: "PIPE",      label: "Pipe Fitting" },
];

const CYLINDER_TYPE_OPTIONS: SelectOption[] = [
  { value: "NEW_CONNECTION",  label: "New Connection (NC)" },
  { value: "CYLINDER_REFILL", label: "Cylinder Refill" },
];

export function OfficeTransactionsClient({ initialTransactions, products, userId, canEdit }: OfficeTransactionsClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Inventory");
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [otherPaymentApp, setOtherPaymentApp] = useState("");
  const [inventoryTypeOptions, setInventoryTypeOptions] = useState<SelectOption[]>(INVENTORY_TYPE_OPTIONS);
  const [cylinderTypeOptions, setCylinderTypeOptions] = useState<SelectOption[]>(CYLINDER_TYPE_OPTIONS);
  const [form, setForm] = useState({
    type: activeTab === "Inventory" ? "OTHER" : "NEW_CONNECTION",
    inventoryId: "",
    description: "",
    qty: "1",
    unitRate: "",
    paymentMode: "CASH",
    remarks: "",
  });

  // Build a unified type map from both option lists for display in the table
  const typeMap: Record<string, string> = Object.fromEntries(
    [...inventoryTypeOptions, ...cylinderTypeOptions].map((o) => [o.value, o.label])
  );

  const filteredTxns = transactions.filter((t) => {
    const dateMatch = new Date(t.date).toDateString() === new Date(selectedDate).toDateString();
    const tabMatch = activeTab === "Inventory"
      ? ["OTHER", "REGULATOR", "PIPE"].includes(t.type)
      : ["NEW_CONNECTION", "CYLINDER_REFILL"].includes(t.type);
    return dateMatch && tabMatch;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unitRate || Number(form.unitRate) <= 0) { setError("Rate is required"); return; }
    const finalPaymentMode = form.paymentMode === "Others" ? otherPaymentApp.trim() : form.paymentMode;
    if (form.paymentMode === "Others" && !otherPaymentApp.trim()) {
      setError("Please specify the payment app name");
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
    fd.append("date", selectedDate);
    fd.append("addedById", userId);
    startTransition(async () => {
      const result = await createOfficeTransaction(fd);
      if (result.error) { setError(result.error); return; }
      if (result.transaction) {
        setTransactions((prev) => [result.transaction!, ...prev]);
        setModalOpen(false);
        setForm({ type: form.type, inventoryId: "", description: "", qty: "1", unitRate: "", paymentMode: "CASH", remarks: "" });
        setOtherPaymentApp("");
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

  return (
    <>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setForm((f) => ({ ...f, type: tab === "Inventory" ? "OTHER" : "NEW_CONNECTION" }));
            }}
            className={cn("px-5 py-2 rounded-lg text-sm font-semibold transition", activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">DATE</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="pl-4 border-l border-slate-100">
            <p className="text-xs text-slate-500">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-800">{filteredTxns.length}</p>
          </div>
          <div className="pl-4 border-l border-slate-100">
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(dayTotal)}</p>
          </div>
        </div>
        <button onClick={() => { setError(""); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
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
                <tr><td colSpan={canEdit ? 8 : 7} className="px-4 py-14 text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400 text-sm">No transactions for this date</p>
                </td></tr>
              ) : filteredTxns.map((t) => (
                <tr key={t.id} className="table-row border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{typeMap[t.type] ?? t.type}</span></td>
                  <td className="px-4 py-3 text-slate-700">{t.product?.name ?? t.description ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{t.qty}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.unitRate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500">{getPaymentModeDisplay(t.paymentMode)}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.remarks ?? "—"}</td>
                  {canEdit && <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>}
                </tr>
              ))}
              {filteredTxns.length > 0 && <tr className="bg-slate-50 font-bold">
                <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Total</td>
                <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(dayTotal)}</td>
                <td colSpan={canEdit ? 3 : 2}></td>
              </tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${activeTab} Transaction`} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type *</label>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inventory / Product</label>
              <select value={form.inventoryId} onChange={(e) => setForm({ ...form, inventoryId: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select (optional)...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Qty</label>
              <input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit Rate (₹) *</label>
              <input type="number" min="0" value={form.unitRate} onChange={(e) => setForm({ ...form, unitRate: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="CASH">Cash</option>
                <option value="PhonePe">PhonePe</option>
                <option value="GPay">GPay</option>
                <option value="Paytm">Paytm</option>
                <option value="CREDIT">Credit</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          {form.paymentMode === "Others" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specify Payment App *</label>
              <input
                required
                value={otherPaymentApp}
                onChange={(e) => setOtherPaymentApp(e.target.value)}
                placeholder="Enter payment app name..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {form.qty && form.unitRate && <div className="bg-slate-50 rounded-xl px-4 py-2 text-sm flex justify-between">
            <span className="text-slate-500">Total Amount:</span>
            <span className="font-bold text-slate-800">{formatCurrency(Number(form.qty) * Number(form.unitRate))}</span>
          </div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks</label>
            <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Any remarks..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">{isPending ? "Saving..." : "Save Transaction"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
