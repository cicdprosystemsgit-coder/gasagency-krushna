"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { SelectWithAdd, type SelectOption } from "@/components/ui/SelectWithAdd";
import { formatCurrency, formatDate, getDaysUntilRenewal, getRenewalStatus } from "@/lib/utils";
import { Plus, AlertTriangle, Car, Building2, Wallet, Trash2 } from "lucide-react";
import { createExpense, createAsset, deleteAsset } from "@/app/actions/expenses";
import type { VehicleAgencyAsset } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

interface Expense {
  id: string;
  date: Date | string;
  description: string;
  amount: number;
  category: string;
  addedBy: { name: string };
}

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialAssets: VehicleAgencyAsset[];
  canEdit: boolean;
  userId: string;
}

const TABS = ["Expenses", "Vehicle & Agency"] as const;

const EXPENSE_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "GENERAL",     label: "General" },
  { value: "FUEL",        label: "Fuel" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OFFICE",      label: "Office" },
  { value: "OTHER",       label: "Other" },
];

export function ExpensesClient({ initialExpenses, initialAssets, canEdit, userId }: ExpensesClientProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Expenses");
  const [expenses, setExpenses] = useState(initialExpenses);
  const [assets, setAssets] = useState(initialAssets);
  const [expenseModal, setExpenseModal] = useState(false);
  const [assetModal, setAssetModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>(EXPENSE_CATEGORY_OPTIONS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const filteredExpenses = expenses.filter((e) => {
    const eDate = new Date(e.date);
    eDate.setHours(0, 0, 0, 0);
    if (dateFrom && eDate < new Date(dateFrom)) return false;
    if (dateTo && eDate > new Date(dateTo)) return false;
    return true;
  });

  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "GENERAL" });
  const [assetForm, setAssetForm] = useState({
    assetType: "VEHICLE",
    name: "",
    registrationDate: "",
    lastRenewalDate: "",
    nextRenewalDate: "",
    price: "",
    comment: "",
  });

  function handleExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.description.trim()) { setError("Description required"); return; }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { setError("Valid amount required"); return; }
    const fd = new FormData();
    Object.entries(expenseForm).forEach(([k, v]) => fd.append(k, v));
    fd.append("addedById", userId);
    startTransition(async () => {
      const result = await createExpense(fd);
      if (result.error) { setError(result.error); return; }
      if (result.expense) {
        setExpenses((prev) => [result.expense!, ...prev]);
        setExpenseModal(false);
        setExpenseForm({ description: "", amount: "", category: "GENERAL" });
      }
    });
  }

  function handleAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetForm.name.trim()) { setError("Asset name required"); return; }
    if (!assetForm.registrationDate) { setError("Registration date required"); return; }
    const fd = new FormData();
    Object.entries(assetForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await createAsset(fd);
      if (result.error) { setError(result.error); return; }
      if (result.asset) {
        setAssets((prev) => [result.asset!, ...prev]);
        setAssetModal(false);
      }
    });
  }

  function handleDeleteAsset(id: string) {
    if (!confirm("Remove this asset?")) return;
    startTransition(async () => {
      const result = await deleteAsset(id);
      if (result.success) setAssets((prev) => prev.filter((a) => a.id !== id));
    });
  }

  const renewalStatusColor = {
    expired: "bg-red-100 border-red-300 text-red-800",
    urgent: "bg-orange-100 border-orange-300 text-orange-800",
    warning: "bg-yellow-100 border-yellow-300 text-yellow-800",
    ok: "bg-green-100 border-green-300 text-green-800",
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-semibold transition",
              activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Expenses" && (
        <>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-slate-500">{filteredExpenses.length} expense records</span>
              <span className="font-bold text-slate-800">
                Total: {formatCurrency(filteredExpenses.reduce((a, e) => a + e.amount, 0))}
              </span>
              <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
            </div>
            {canEdit && (
              <button
                onClick={() => { setError(""); setExpenseModal(true); }}
                className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-14 text-center text-slate-400">No expense records found for this range</td></tr>
                  ) : filteredExpenses.map((e) => (
                    <tr key={e.id} className="table-row border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 text-slate-500">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{e.description}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{e.category}</span></td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{e.addedBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "Vehicle & Agency" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700">Vehicle & Agency Assets — Renewal Tracker</h3>
            {canEdit && (
              <button
                onClick={() => { setError(""); setAssetModal(true); }}
                className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
              >
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {assets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center text-slate-400">
                <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No assets added yet</p>
              </div>
            ) : (
              assets.map((asset) => {
                const daysLeft = asset.nextRenewalDate ? getDaysUntilRenewal(asset.nextRenewalDate) : null;
                const status = daysLeft !== null ? getRenewalStatus(daysLeft) : "ok";
                return (
                  <div key={asset.id} className={cn("rounded-2xl border-2 p-5 flex items-start justify-between", daysLeft !== null && daysLeft <= 30 ? renewalStatusColor[status] : "bg-white border-slate-100")}>
                    <div className="flex items-start gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", asset.assetType === "VEHICLE" ? "bg-blue-600" : "bg-purple-600")}>
                        {asset.assetType === "VEHICLE" ? <Car className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{asset.name}</h4>
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{asset.assetType}</span>
                          {daysLeft !== null && daysLeft <= 30 && (
                            <div className="flex items-center gap-1 text-xs font-bold text-red-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {daysLeft < 0 ? "EXPIRED" : `${daysLeft}d left`}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-xs text-slate-600">
                          <div><span className="text-slate-400">Reg. Date:</span> {formatDate(asset.registrationDate)}</div>
                          {asset.lastRenewalDate && <div><span className="text-slate-400">Last Renewal:</span> {formatDate(asset.lastRenewalDate)}</div>}
                          {asset.nextRenewalDate && <div><span className="text-slate-400">Next Renewal:</span> <strong>{formatDate(asset.nextRenewalDate)}</strong></div>}
                          <div><span className="text-slate-400">Value:</span> {formatCurrency(asset.price)}</div>
                          {asset.comment && <div className="col-span-2"><span className="text-slate-400">Note:</span> {asset.comment}</div>}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Expense Modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense" size="sm">
        <form onSubmit={handleExpense} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description *</label>
            <input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="e.g., Vehicle fuel, Office supplies" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
              <input type="number" min="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <SelectWithAdd
                value={expenseForm.category}
                onChange={(val) => setExpenseForm({ ...expenseForm, category: val })}
                options={categoryOptions}
                addLabel="Category"
                onAdd={(label, value) =>
                  setCategoryOptions((prev) => [...prev, { value, label }])
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setExpenseModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">{isPending ? "Saving..." : "Add Expense"}</button>
          </div>
        </form>
      </Modal>

      {/* Asset Modal */}
      <Modal open={assetModal} onClose={() => setAssetModal(false)} title="Add Vehicle / Agency Asset" size="lg">
        <form onSubmit={handleAsset} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asset Type *</label>
              <select value={assetForm.assetType} onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="VEHICLE">Vehicle</option>
                <option value="AGENCY">Agency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name / Reg. No. *</label>
              <input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g., MH12AB1234 or Agency License" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registration Date *</label>
              <input type="date" value={assetForm.registrationDate} onChange={(e) => setAssetForm({ ...assetForm, registrationDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Renewal</label>
              <input type="date" value={assetForm.lastRenewalDate} onChange={(e) => setAssetForm({ ...assetForm, lastRenewalDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Next Renewal Date ⚠️</label>
              <input type="date" value={assetForm.nextRenewalDate} onChange={(e) => setAssetForm({ ...assetForm, nextRenewalDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-400 mt-1">Alerts shown when &lt;30 days</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asset Value (₹)</label>
              <input type="number" min="0" value={assetForm.price} onChange={(e) => setAssetForm({ ...assetForm, price: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comment</label>
              <input value={assetForm.comment} onChange={(e) => setAssetForm({ ...assetForm, comment: e.target.value })} placeholder="Any notes..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setAssetModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">{isPending ? "Saving..." : "Add Asset"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
