"use client";

import { useState, useEffect, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Package, Boxes, TrendingUp, TrendingDown,
  Coins, BarChart2, DollarSign, ArrowUpRight
} from "lucide-react";
import { createProduct, updateProduct, deleteProducts } from "@/app/actions/products";
import type { Product } from "@/generated/prisma";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface InventoryClientProps {
  initialProducts: Product[];
  isAdmin: boolean;
  dashboardData: {
    catalogCount: number;
    catalogCostValue: number;
    catalogSaleValue: number;

    godownStockTotal: number;
    godownStockCost: number;
    godownStockSale: number;

    officeStockTotal: number;
    officeStockCost: number;
    officeStockSale: number;

    salesTotalQty: number;
    salesTotalRevenue: number;
    salesTotalCOGS: number;

    stockValuationList: Array<{
      productId: string;
      productName: string;
      unitCost: number;
      saleRate: number;
      officeStock: number;
      godownStock: number;
      officeCostValuation: number;
      godownCostValuation: number;
      totalStock: number;
      totalCostValuation: number;
      totalSaleValuation: number;
    }>;

    salesList: Array<{
      productId: string;
      productName: string;
      qtySold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }>;
  };
}

function StatCard({ title, value, sub, color, icon }: {
  title: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 bg-white border border-zinc-200 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15", color }}>
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold tracking-tight text-zinc-900">{value}</p>
      {sub && <p className="text-[11px] mt-1 text-zinc-400 font-medium">{sub}</p>}
    </div>
  );
}

function InventoryDashboard({ data }: { data: InventoryClientProps["dashboardData"] }) {
  const marginPercent = data.salesTotalRevenue > 0 
    ? Math.round(((data.salesTotalRevenue - data.salesTotalCOGS) / data.salesTotalRevenue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catalog Products"
          value={`${data.catalogCount} Items`}
          sub={`Avg margin: ₹${Math.round(data.catalogSaleValue - data.catalogCostValue).toLocaleString()}`}
          color="#3B82F6"
          icon={<Boxes className="w-4 h-4" />}
        />
        <StatCard
          title="Godown Stock"
          value={formatCurrency(data.godownStockCost)}
          sub={`${data.godownStockTotal} units · Sale Val: ₹${data.godownStockSale.toLocaleString()}`}
          color="#F97316"
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          title="Office Stock"
          value={formatCurrency(data.officeStockCost)}
          sub={`${data.officeStockTotal} units · Sale Val: ₹${data.officeStockSale.toLocaleString()}`}
          color="#10B981"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.salesTotalRevenue)}
          sub={`${data.salesTotalQty} units sold · Profit Margin: ${marginPercent}%`}
          color="#8B5CF6"
          icon={<Coins className="w-4 h-4" />}
        />
      </div>

      {/* Double Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Stock Distribution */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <p className="text-[13px] font-bold text-zinc-800">Stock Distribution (Godown vs Office)</p>
          </div>
          {data.stockValuationList.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-[12px] text-zinc-400">No stock data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.stockValuationList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="productName" tick={{ fontSize: 9, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 9, fill: "#71717A" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Bar dataKey="godownStock" name="Godown Stock" fill="#F97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="officeStock" name="Office Stock" fill="#10B981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right Chart: Sales & Cost analysis */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <p className="text-[13px] font-bold text-zinc-800">Monthly Revenue vs cost (COGS)</p>
          </div>
          {data.salesList.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-[12px] text-zinc-400">No sales transactions recorded this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.salesList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="productName" tick={{ fontSize: 9, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 9, fill: "#71717A" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Bar dataKey="revenue" name="Sales Revenue" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cogs" name="Cost of Goods (COGS)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stock valuation breakdown table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <p className="text-[14px] font-bold text-zinc-800">Inventory Stock Valuation &amp; Unit Costs</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
            Total Combined Valuation: {formatCurrency(data.godownStockCost + data.officeStockCost)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                {["Product", "Unit Cost", "Sale Rate", "Office Stock", "Godown Stock", "Total Stock", "Stock Cost Value", "Stock Sale Value", "Potential Margin"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {data.stockValuationList.map((sv) => {
                const margin = sv.saleRate - sv.unitCost;
                return (
                  <tr key={sv.productId} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-850">{sv.productName}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatCurrency(sv.unitCost)}</td>
                    <td className="px-4 py-3 text-zinc-900 font-medium">{formatCurrency(sv.saleRate)}</td>
                    <td className="px-4 py-3 font-medium text-emerald-600">{sv.officeStock}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{sv.godownStock}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900">{sv.totalStock}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-800">{formatCurrency(sv.totalCostValuation)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-800">{formatCurrency(sv.totalSaleValuation)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      {sv.totalStock > 0 ? formatCurrency(margin * sv.totalStock) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Product Sales valuation Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <p className="text-[14px] font-bold text-zinc-800">Monthly Product Sales &amp; Cost Valuation</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
            Total Profit: {formatCurrency(data.salesTotalRevenue - data.salesTotalCOGS)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                {["Product", "Units Sold", "Total COGS Cost", "Total Sales Revenue", "Net Profit", "Margin Achievement"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {data.salesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 text-[12px]">
                    No sales recorded this month
                  </td>
                </tr>
              ) : (
                data.salesList.map((sl) => {
                  const itemMargin = sl.revenue > 0 ? Math.round((sl.profit / sl.revenue) * 100) : 0;
                  return (
                    <tr key={sl.productId} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-850">{sl.productName}</td>
                      <td className="px-4 py-3 font-bold text-zinc-800">{sl.qtySold}</td>
                      <td className="px-4 py-3 text-zinc-500 font-medium">{formatCurrency(sl.cogs)}</td>
                      <td className="px-4 py-3 text-zinc-900 font-semibold">{formatCurrency(sl.revenue)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{formatCurrency(sl.profit)}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-approved font-semibold text-[11px]">
                          {itemMargin}% profit
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InventoryClient({ initialProducts, isAdmin, dashboardData }: InventoryClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [activeTab, setActiveTab] = useState<"dashboard" | "external" | "cylinders">("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false", hsnCode: "" });

  useEffect(() => {
    const cost = parseFloat(form.unitCost) || 0;
    const rate = parseFloat(form.saleRate) || 0;
    const computed = rate - cost;
    const computedStr = computed > 0 ? String(Number(computed.toFixed(2))) : "0";
    if (form.margin !== computedStr) {
      setForm((prev) => ({ ...prev, margin: computedStr }));
    }
  }, [form.unitCost, form.saleRate]);

  const filteredProducts = activeTab === "dashboard"
    ? []
    : products.filter((p: any) => activeTab === "cylinders" ? p.isCylinder : !p.isCylinder);

  function openAdd() {
    setEditProduct(null);
    setForm({
      name: "",
      unitCost: "",
      saleRate: "",
      margin: "",
      isCylinder: activeTab === "cylinders" ? "true" : "false",
      hsnCode: ""
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: any) {
    setEditProduct(p);
    setForm({
      name: p.name,
      unitCost: String(p.unitCost),
      saleRate: String(p.saleRate),
      margin: String(p.margin),
      isCylinder: String(p.isCylinder ?? false),
      hsnCode: p.hsnCode ?? ""
    });
    setError("");
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (editProduct) fd.append("id", editProduct.id);
    startTransition(async () => {
      const result = editProduct ? await updateProduct(fd) : await createProduct(fd);
      if (result.error) { setError(result.error); return; }
      if (result.product) {
        if (editProduct) setProducts((prev) => prev.map((p) => p.id === result.product!.id ? result.product! : p));
        else setProducts((prev) => [result.product!, ...prev]);
        setModalOpen(false);
      }
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} product(s)?`)) return;
    const toDelete = new Set(selected);
    const fd = new FormData();
    Array.from(toDelete).forEach((id) => fd.append("ids", id));
    startTransition(async () => {
      const result = await deleteProducts(fd);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => !toDelete.has(p.id)));
        setSelected((prev) => {
          const n = new Set(prev);
          toDelete.forEach((id) => n.delete(id));
          return n;
        });
        setError("");
      } else {
        setError(result.error || "Failed to delete product(s).");
      }
    });
  }

  function handleDeleteSingle(id: string, name: string) {
    if (!confirm(`Delete product "${name}"?`)) return;
    const fd = new FormData();
    fd.append("ids", id);
    startTransition(async () => {
      const result = await deleteProducts(fd);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        setError("");
      } else {
        setError(result.error || "Failed to delete product. It may be linked to existing records.");
      }
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <>
      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab("dashboard"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === "dashboard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 Inventory Analysis
        </button>
        <button
          onClick={() => { setActiveTab("external"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === "external"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📦 External Accessories
        </button>
        <button
          onClick={() => { setActiveTab("cylinders"); setSelected(new Set()); }}
          className={`py-2 px-4 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === "cylinders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🔥 Gas Cylinders
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-2.5 text-[13px] px-4 py-3 rounded-lg mb-4"
          style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}
        >
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} style={{ color: "#B91C1C", opacity: 0.6, cursor: "pointer", background: "none", border: "none", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {activeTab === "dashboard" ? (
        <InventoryDashboard data={dashboardData} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {isAdmin && selected.size > 0 && (
                <button onClick={handleDeleteSelected} disabled={isPending} className="btn btn-danger">
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})
                </button>
              )}
              <span className="text-[13px]" style={{ color: "#A1A1AA" }}>
                {filteredProducts.length} {activeTab === "cylinders" ? "cylinder" : "accessory"}{filteredProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="btn btn-primary"
                style={{ boxShadow: "0 1px 4px rgba(37,99,235,0.25)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add {activeTab === "cylinders" ? "cylinder" : "accessory"}
              </button>
            )}
          </div>

          {/* Product Cards (Mobile <768px) and Table (Desktop >=768px) */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}>
            
            {/* MOBILE CARDS VIEW (<768px) */}
            <div className="block md:hidden divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px] font-semibold text-zinc-600">No products found</p>
                  {isAdmin && <button onClick={openAdd} className="text-[12px] font-bold text-blue-600 mt-1">Add your first item →</button>}
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div key={`mob-prod-${p.id}`} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {isAdmin && (
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-bold text-zinc-900 leading-snug">{p.name}</p>
                          <span className="text-[10px] text-zinc-400 font-mono">HSN: {p.hsnCode ?? "—"}</span>
                        </div>
                      </div>
                      <span className={`badge ${p.isActive ? "badge-approved" : "badge-neutral"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-2.5 rounded-lg text-center text-xs border border-zinc-100">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Cost</span>
                        <span className="font-semibold text-zinc-600">{formatCurrency(p.unitCost)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Sale Rate</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(p.saleRate)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">Margin</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(p.margin)}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(p.id, p.name)}
                          className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP TABLE VIEW (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={() => selected.size === filteredProducts.length ? setSelected(new Set()) : setSelected(new Set(filteredProducts.map((p) => p.id)))}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                      </th>
                    )}
                    <th>Product name</th>
                    <th>HSN Code</th>
                    <th className="text-right">Unit cost</th>
                    <th className="text-right">Sale rate</th>
                    <th className="text-right">Margin</th>
                    <th className="text-center">Status</th>
                    {isAdmin && <th className="text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 6} className="py-14 text-center">
                        <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                        <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No products here yet</p>
                        {isAdmin && <button onClick={openAdd} className="text-[12px] font-medium mt-1.5" style={{ color: "#2563EB" }}>Add your first item →</button>}
                      </td>
                    </tr>
                  ) : filteredProducts.map((p) => (
                    <tr key={p.id}>
                      {isAdmin && (
                        <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-3.5 h-3.5 rounded accent-blue-600" /></td>
                      )}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                            <Package className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="text-[13px]" style={{ color: "#52525B" }}>{p.hsnCode ?? "—"}</td>
                      <td className="text-right text-[13px]" style={{ color: "#52525B" }}>{formatCurrency(p.unitCost)}</td>
                      <td className="text-right text-[13px] font-medium" style={{ color: "#18181B" }}>{formatCurrency(p.saleRate)}</td>
                      <td className="text-right text-[13px] font-medium" style={{ color: "#16A34A" }}>{formatCurrency(p.margin)}</td>
                      <td className="text-center">
                        <span className={`badge ${p.isActive ? "badge-approved" : "badge-neutral"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(p)}
                              title="Edit product"
                              className="btn-action btn-action-primary"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(p.id, p.name)}
                              title="Delete product"
                              className="btn-action btn-action-danger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? "Edit product" : "Add product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product Category *</label>
            <select
              value={form.isCylinder}
              onChange={(e) => setForm({ ...form, isCylinder: e.target.value })}
              className="input"
            >
              <option value="false">External Accessory (Stoves, Regulators, Pipes, etc.)</option>
              <option value="true">Gas Cylinder (Commercial, Domestic, etc.)</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., 14.2 KG Cylinder" className="input" />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>HSN Code</label>
            <input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="e.g., 2711" className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Unit cost (₹)", key: "unitCost" },
              { label: "Sale rate (₹)", key: "saleRate" },
              { label: "Margin (₹)", key: "margin" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder="0"
                  className={`input ${f.key === "margin" ? "bg-slate-50 cursor-not-allowed opacity-75 font-semibold text-slate-500" : ""}`}
                  readOnly={f.key === "margin"}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Saving…" : editProduct ? "Update" : "Add product"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
