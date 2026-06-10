"use client";

import { useState, useTransition } from "react";
import {
  createExpenseCategory, updateExpenseCategory,
  deleteExpenseCategory, seedDefaultCategories,
} from "@/app/actions/expense-categories";
import { formatCurrency } from "@/lib/utils";
import { Plus, X, Pencil, Trash2, Zap, TrendingUp, AlertTriangle } from "lucide-react";

type Category = { id: string; name: string; monthlyBudget: number; color: string | null; isActive: boolean };
type BudgetItem = { id: string; name: string; color: string; budget: number; actual: number; remaining: number | null; pct: number | null; overspent: boolean };
type Expense = { id: string; description: string; amount: number; category: string; date: string; expenseCategory: { name: string; color: string } | null; addedBy: { name: string } };

type Props = {
  budgetData: BudgetItem[];
  uncategorizedSpend: number;
  categories: Category[];
  expenses: Expense[];
};

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#EC4899", "#EA580C", "#6B7280", "#10B981"];

export function ExpenseCategoriesClient({ budgetData: initial, uncategorizedSpend, categories: initCats, expenses }: Props) {
  const [budgetData, setBudgetData] = useState<BudgetItem[]>(initial);
  const [categories, setCategories] = useState<Category[]>(initCats);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", monthlyBudget: "", color: COLORS[0] });

  const totalBudget = budgetData.reduce((s, d) => s + d.budget, 0);
  const totalActual = budgetData.reduce((s, d) => s + d.actual, 0);
  const overspentCount = budgetData.filter((d) => d.overspent).length;

  const handleSave = () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    startTransition(async () => {
      if (editId) {
        await updateExpenseCategory(editId, { name: form.name, monthlyBudget: Number(form.monthlyBudget) || 0, color: form.color });
        setCategories((prev) => prev.map((c) => c.id === editId ? { ...c, name: form.name, monthlyBudget: Number(form.monthlyBudget) || 0, color: form.color } : c));
      } else {
        const result = await createExpenseCategory({ name: form.name, monthlyBudget: Number(form.monthlyBudget) || 0, color: form.color });
        if ("error" in result && result.error) { setError(result.error); return; }
        if ("category" in result && result.category) setCategories((prev) => [...prev, result.category as Category]);
      }
      setShowForm(false); setEditId(null); setForm({ name: "", monthlyBudget: "", color: COLORS[0] }); setError(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteExpenseCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    });
  };

  const handleSeedDefaults = () => {
    startTransition(async () => {
      await seedDefaultCategories();
      window.location.reload();
    });
  };

  const startEdit = (c: Category) => {
    setEditId(c.id); setForm({ name: c.name, monthlyBudget: String(c.monthlyBudget), color: c.color ?? COLORS[0] });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Expense Categories & Budget</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Set monthly budgets and track spending by category</p>
        </div>
        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <button onClick={handleSeedDefaults} disabled={isPending} className="btn btn-secondary flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Seed Defaults
            </button>
          )}
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", monthlyBudget: "", color: COLORS[0] }); }} className="btn btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Budget", value: formatCurrency(totalBudget), color: "#2563EB" },
          { label: "Total Spent", value: formatCurrency(totalActual), color: "#D97706" },
          { label: "Remaining", value: formatCurrency(totalBudget - totalActual), color: totalBudget - totalActual >= 0 ? "#16A34A" : "#DC2626" },
          { label: "Overspent Categories", value: String(overspentCount), color: overspentCount > 0 ? "#DC2626" : "#16A34A" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>{s.label}</p>
            <p className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-section flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{editId ? "Edit Category" : "New Category"}</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Category Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fuel" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Monthly Budget (₹)</label>
                <input className="input" type="number" min="0" value={form.monthlyBudget} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-6 h-6 rounded-full transition-transform hover:scale-110" style={{ background: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : editId ? "Update" : "Create"}</button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress Cards */}
      {budgetData.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {budgetData.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{item.name}</p>
                </div>
                {item.overspent && <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />}
              </div>
              <div className="flex items-end justify-between mb-2">
                <p className="text-[15px] font-bold" style={{ color: item.overspent ? "#DC2626" : "#18181B" }}>{formatCurrency(item.actual)}</p>
                {item.budget > 0 && <p className="text-[11px]" style={{ color: "#A1A1AA" }}>of {formatCurrency(item.budget)}</p>}
              </div>
              {item.budget > 0 && (
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#E4E4E7" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.pct ?? 0, 100)}%`,
                      background: item.overspent ? "#DC2626" : (item.pct ?? 0) > 80 ? "#D97706" : item.color,
                    }}
                  />
                </div>
              )}
              {item.budget > 0 && (
                <p className="text-[11px] mt-1" style={{ color: item.overspent ? "#DC2626" : "#A1A1AA" }}>
                  {item.overspent ? `Over by ${formatCurrency(Math.abs(item.remaining ?? 0))}` : `${formatCurrency(item.remaining ?? 0)} remaining`}
                </p>
              )}
            </div>
          ))}
          {uncategorizedSpend > 0 && (
            <div className="card p-4" style={{ borderStyle: "dashed" }}>
              <p className="text-[13px] font-medium mb-2" style={{ color: "#71717A" }}>Uncategorized</p>
              <p className="text-[15px] font-bold" style={{ color: "#D97706" }}>{formatCurrency(uncategorizedSpend)}</p>
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>Assign categories to track budgets</p>
            </div>
          )}
        </div>
      )}

      {/* Categories table */}
      <div className="card overflow-hidden mb-6">
        <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Categories ({categories.length})</p></div>
        <table className="table">
          <thead><tr><th>Name</th><th>Monthly Budget</th><th>Color</th><th></th></tr></thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                No categories yet. <button onClick={handleSeedDefaults} className="text-blue-600 underline">Seed defaults</button> or create one.
              </td></tr>
            ) : categories.map((c) => (
              <tr key={c.id}>
                <td><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: c.color ?? "#6B7280" }} /><span className="font-medium">{c.name}</span></div></td>
                <td>{c.monthlyBudget > 0 ? formatCurrency(c.monthlyBudget) : <span style={{ color: "#A1A1AA" }}>No limit</span>}</td>
                <td><div className="w-6 h-6 rounded" style={{ background: c.color ?? "#6B7280" }} /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(c)}
                      title="Edit"
                      className="btn-action btn-action-primary w-7 h-7"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Delete"
                      className="btn-action btn-action-danger w-7 h-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent expenses */}
      <div className="card overflow-hidden">
        <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>This Month's Expenses</p></div>
        <table className="table">
          <thead><tr><th>Description</th><th>Category</th><th>Amount</th><th>Date</th><th>By</th></tr></thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No expenses this month</td></tr>
            ) : expenses.map((e) => (
              <tr key={e.id}>
                <td className="font-medium">{e.description}</td>
                <td>
                  {e.expenseCategory ? (
                    <span className="flex items-center gap-1.5 text-[12px]">
                      <span className="w-2 h-2 rounded-full" style={{ background: e.expenseCategory.color ?? "#6B7280" }} />
                      {e.expenseCategory.name}
                    </span>
                  ) : <span className="badge badge-neutral">{e.category}</span>}
                </td>
                <td className="font-semibold" style={{ color: "#DC2626" }}>{formatCurrency(e.amount)}</td>
                <td className="muted text-[12px]">{new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                <td className="muted text-[12px]">{e.addedBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
