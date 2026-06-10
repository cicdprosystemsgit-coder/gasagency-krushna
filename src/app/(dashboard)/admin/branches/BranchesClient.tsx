"use client";

import { useState, useTransition } from "react";
import { Plus, X, Pencil, Trash2, Building2, MapPin, Phone, User, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { createBranch, updateBranch, deactivateBranch, transferBranchStock } from "@/app/actions/branches";

type Branch = { id: string; name: string; address: string; city: string; phone: string | null; managerId: string | null; isActive: boolean; createdAt: string };
type Manager = { id: string; name: string; phone: string | null };

type Props = { branches: Branch[]; managers: Manager[]; role: string; products?: { id: string; name: string }[] };

const emptyForm = { name: "", address: "", city: "", phone: "", managerId: "" };
const emptyTransfer = { fromBranchId: "", toBranchId: "", productId: "", qty: "", notes: "" };

export function BranchesClient({ branches: initial, managers, role, products = [] }: Props) {
  const [branches, setBranches] = useState<Branch[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!form.name.trim()) { setError("Branch name is required"); return; }
    if (!form.address.trim()) { setError("Address is required"); return; }
    if (!form.city.trim()) { setError("City is required"); return; }

    startTransition(async () => {
      const data = { ...form, managerId: form.managerId || undefined };
      if (editId) {
        const result = await updateBranch(editId, data);
        if ("error" in result) { setError(result.error ?? null); return; }
        setBranches((prev) => prev.map((b) => b.id === editId ? { ...b, ...form } : b));
      } else {
        const result = await createBranch(data);
        if ("error" in result) { setError(result.error ?? null); return; }
        if ("branch" in result) setBranches((prev) => [...prev, result.branch as unknown as Branch]);
      }
      setShowForm(false); setEditId(null); setForm(emptyForm); setError(null);
    });
  };

  const handleTransfer = () => {
    if (!transferForm.fromBranchId) { setError("Select source branch"); return; }
    if (!transferForm.toBranchId)   { setError("Select destination branch"); return; }
    if (!transferForm.productId)    { setError("Select a product"); return; }
    const qty = parseInt(transferForm.qty);
    if (!qty || qty < 1)            { setError("Enter a valid quantity"); return; }

    startTransition(async () => {
      const result = await transferBranchStock({
        fromBranchId: transferForm.fromBranchId,
        toBranchId:   transferForm.toBranchId,
        productId:    transferForm.productId,
        qty,
        notes: transferForm.notes || undefined,
      });
      if ("error" in result) { setError(result.error ?? null); return; }
      setTransferSuccess(`Transferred ${result.qty} units from ${result.from} to ${result.to}`);
      setTransferForm(emptyTransfer);
      setError(null);
      setTimeout(() => setTransferSuccess(null), 5000);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deactivateBranch(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
    });
  };

  const startEdit = (b: Branch) => {
    setEditId(b.id);
    setForm({ name: b.name, address: b.address, city: b.city, phone: b.phone ?? "", managerId: b.managerId ?? "" });
    setShowForm(true);
  };

  const managerName = (id: string | null) => managers.find((m) => m.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Branch Management</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Manage multiple distribution points under your agency</p>
        </div>
        <div className="flex items-center gap-2">
          {branches.length >= 2 && (
            <button onClick={() => { setShowTransfer(!showTransfer); setError(null); setTransferSuccess(null); }} className="btn btn-secondary flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Stock
            </button>
          )}
          {role === "ADMIN" && (
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="btn btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Branch
            </button>
          )}
        </div>
      </div>

      {/* Transfer Stock Panel */}
      {showTransfer && (
        <div className="card mb-6">
          <div className="card-section flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Cross-Branch Stock Transfer</p>
            <button onClick={() => setShowTransfer(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
          </div>
          <div className="p-5">
            {transferSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
                <p className="text-[13px]" style={{ color: "#15803D" }}>{transferSuccess}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>From Branch *</label>
                <select className="input" value={transferForm.fromBranchId} onChange={(e) => setTransferForm({ ...transferForm, fromBranchId: e.target.value })}>
                  <option value="">Select source…</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>To Branch *</label>
                <select className="input" value={transferForm.toBranchId} onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}>
                  <option value="">Select destination…</option>
                  {branches.filter((b) => b.id !== transferForm.fromBranchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product *</label>
                <select className="input" value={transferForm.productId} onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Quantity *</label>
                <input className="input" type="number" min="1" value={transferForm.qty} onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
                <input className="input" value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder="Optional reason" />
              </div>
            </div>
            {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <button onClick={handleTransfer} disabled={isPending} className="btn btn-primary">
              {isPending ? "Transferring…" : "Transfer Stock"}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <div className="card-section flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{editId ? "Edit Branch" : "New Branch"}</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Branch Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. North Zone Branch" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>City *</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Address *</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Branch Manager</label>
                <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">No manager assigned</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : editId ? "Update" : "Create Branch"}</button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {branches.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#E4E4E7" }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#18181B" }}>No branches yet</p>
          <p className="text-[13px] mb-4" style={{ color: "#A1A1AA" }}>Add branch locations for multi-point distribution</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">Add First Branch</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                    <Building2 className="w-4 h-4" style={{ color: "#2563EB" }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>{b.name}</p>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{b.city}</p>
                  </div>
                </div>
                {role === "ADMIN" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(b)}
                      title="Edit"
                      className="btn-action btn-action-primary w-7 h-7"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      title="Delete"
                      className="btn-action btn-action-danger w-7 h-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 text-[12px]" style={{ color: "#52525B" }}>
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#A1A1AA" }} />
                  {b.address}
                </div>
                {b.phone && (
                  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#52525B" }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: "#A1A1AA" }} /> {b.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#52525B" }}>
                  <User className="w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                  {managerName(b.managerId)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
