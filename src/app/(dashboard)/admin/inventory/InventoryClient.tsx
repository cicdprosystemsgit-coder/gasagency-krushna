"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { createProduct, updateProduct, deleteProducts } from "@/app/actions/products";
import type { Product } from "@/generated/prisma";

interface InventoryClientProps {
  initialProducts: Product[];
  isAdmin: boolean;
}

export function InventoryClient({ initialProducts, isAdmin }: InventoryClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [activeTab, setActiveTab] = useState<"external" | "cylinders">("external");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false" });

  const filteredProducts = products.filter((p: any) => activeTab === "cylinders" ? p.isCylinder : !p.isCylinder);

  function openAdd() {
    setEditProduct(null);
    setForm({
      name: "",
      unitCost: "",
      saleRate: "",
      margin: "",
      isCylinder: activeTab === "cylinders" ? "true" : "false"
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
      isCylinder: String(p.isCylinder ?? false)
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

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
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
                  <td colSpan={isAdmin ? 7 : 5} className="py-14 text-center">
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
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Unit cost (₹)", key: "unitCost" },
              { label: "Sale rate (₹)", key: "saleRate" },
              { label: "Margin (₹)", key: "margin" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>{f.label}</label>
                <input type="number" min="0" step="0.01" value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder="0" className="input" />
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
