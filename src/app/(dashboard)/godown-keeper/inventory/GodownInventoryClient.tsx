"use client";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Package, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2, Plus, Boxes, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { receiveGodownStock, dispatchToOffice, updateGodownMovement, deleteGodownMovement } from "@/app/actions/godown-inventory";

interface Movement {
  id: string; date: Date | string; moveType: "RECEIVED" | "DISPATCHED";
  qty: number; batchNo: string | null; notes: string | null;
  product: { id: string; name: string }; recordedBy: { name: string };
}
interface Product { id: string; name: string; }

function computeStock(movements: Movement[]) {
  const map: Record<string, { name: string; received: number; dispatched: number }> = {};
  movements.forEach(m => {
    if (!map[m.product.id]) map[m.product.id] = { name: m.product.name, received: 0, dispatched: 0 };
    if (m.moveType === "RECEIVED") map[m.product.id].received += m.qty;
    if (m.moveType === "DISPATCHED") map[m.product.id].dispatched += m.qty;
  });
  return Object.entries(map).map(([id, v]) => ({ id, ...v, available: v.received - v.dispatched }));
}

const blankForm = { productId: "", qty: "", batchNo: "", notes: "", date: new Date().toISOString().slice(0, 10) };

export function GodownInventoryClient({ initialMovements, products, userId }: {
  initialMovements: Movement[]; products: Product[]; userId: string;
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [view, setView] = useState<"stock" | "history">("stock");
  const [modalType, setModalType] = useState<"receive" | "dispatch" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Movement | null>(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const stock = computeStock(movements);

  function openReceive() { setForm(blankForm); setError(""); setEditTarget(null); setModalType("receive"); }
  function openDispatch() { setForm(blankForm); setError(""); setEditTarget(null); setModalType("dispatch"); }
  function openEdit(m: Movement) {
    setEditTarget(m);
    setForm({ productId: m.product.id, qty: String(m.qty), batchNo: m.batchNo ?? "", notes: m.notes ?? "", date: new Date(m.date).toISOString().slice(0, 10) });
    setError(""); setModalType("edit");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.qty || Number(form.qty) <= 0) { setError("Enter a valid quantity"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("recordedById", userId);
    startTransition(async () => {
      if (modalType === "edit" && editTarget) {
        const res = await updateGodownMovement(editTarget.id, fd);
        if (res.error) { setError(res.error); return; }
        setMovements(p => p.map(m => m.id === editTarget.id ? { ...m, qty: Number(form.qty), batchNo: form.batchNo || null, notes: form.notes || null, date: new Date(form.date) } : m));
      } else if (modalType === "receive") {
        if (!form.productId) { setError("Select a product"); return; }
        const res = await receiveGodownStock(fd);
        if (res.error) { setError(res.error); return; }
        if (res.record) setMovements(p => [res.record! as Movement, ...p]);
      } else if (modalType === "dispatch") {
        if (!form.productId) { setError("Select a product"); return; }
        const res = await dispatchToOffice(fd);
        if (res.error) { setError(res.error); return; }
        if (res.record) setMovements(p => [res.record! as Movement, ...p]);
      }
      setModalType(null); setError("");
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this movement?")) return;
    startTransition(async () => {
      const res = await deleteGodownMovement(id);
      if (res.error) { alert(res.error); return; }
      setMovements(p => p.filter(m => m.id !== id));
    });
  }

  const dispatchableProducts = stock.filter(s => s.available > 0);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (d: Date | string) => { const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; };
  const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "#18181B" }}>Godown Inventory</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>Manage product stock — receive from company, dispatch to office</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openReceive} className="btn btn-primary">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Receive Stock
          </button>
          <button onClick={openDispatch} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}>
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Dispatch to Office
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Products Tracked", value: stock.length, icon: <Boxes className="w-4 h-4" />, bg: "#EFF6FF", color: "#2563EB" },
          { label: "Total Received", value: movements.filter(m => m.moveType === "RECEIVED").reduce((a, m) => a + m.qty, 0), icon: <TrendingDown className="w-4 h-4" />, bg: "#F0FDF4", color: "#16A34A" },
          { label: "Total Dispatched", value: movements.filter(m => m.moveType === "DISPATCHED").reduce((a, m) => a + m.qty, 0), icon: <TrendingUp className="w-4 h-4" />, bg: "#FAF5FF", color: "#7C3AED" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "#71717A" }}>{k.label}</p>
              <p className="text-[22px] font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F4F4F5" }}>
        {([["stock", "📦 Stock Levels"], ["history", "📋 Movement History"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} className="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-all"
            style={view === v ? { background: "#fff", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : { background: "transparent", color: "#71717A" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Stock levels */}
      {view === "stock" && (
        stock.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <Boxes className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
            <p className="text-[13px]" style={{ color: "#71717A" }}>No inventory yet — click "Receive Stock" to begin</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Current Stock — All Products</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>Net available = total received − dispatched to office</p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                  {["Product", "Total Received", "Dispatched to Office", "Net Available"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stock.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < stock.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                          <Package className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[16px]" style={{ color: "#2563EB" }}>{s.received}</td>
                    <td className="px-5 py-3.5 font-bold text-[16px]" style={{ color: "#7C3AED" }}>{s.dispatched}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-3 py-1 rounded-full font-bold text-[15px]"
                        style={{ background: s.available > 0 ? "#F0FDF4" : "#FEF2F2", color: s.available > 0 ? "#15803D" : "#B91C1C" }}>
                        {s.available}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Movement history */}
      {view === "history" && (
        movements.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
            <p className="text-[13px]" style={{ color: "#71717A" }}>No movements recorded yet</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>All Movements ({movements.length})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                    {["Date", "Product", "Type", "Qty", "Batch", "Notes", "By", "Actions"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: i < movements.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-medium" style={{ color: "#18181B" }}>{fmtDate(m.date)}</p>
                        <p className="text-[10px]" style={{ color: "#A1A1AA" }}>{fmtTime(m.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3 h-3" style={{ color: "#2563EB" }} />
                          <span className="text-[12px] font-medium" style={{ color: "#18181B" }}>{m.product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={m.moveType === "RECEIVED" ? { background: "#EFF6FF", color: "#1D4ED8" } : { background: "#F0FDF4", color: "#15803D" }}>
                          {m.moveType === "RECEIVED" ? "↓ Received" : "↑ To Office"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[14px]" style={{ color: m.moveType === "RECEIVED" ? "#2563EB" : "#7C3AED" }}>{m.qty}</td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: "#71717A" }}>{m.batchNo || "—"}</td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: "#71717A" }}>{m.notes || "—"}</td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: "#52525B" }}>{m.recordedBy.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(m)}
                            title="Edit"
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: 6,
                              border: "1px solid #E4E4E7", background: "#fff",
                              color: "#2563EB", cursor: "pointer",
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            title="Delete"
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: 6,
                              border: "1px solid #FCA5A5", background: "#FEF2F2",
                              color: "#DC2626", cursor: "pointer",
                            }}
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
          </div>
        )
      )}

      {/* Modal */}
      <Modal
        open={modalType !== null}
        onClose={() => { setModalType(null); setError(""); }}
        title={modalType === "receive" ? "Receive Stock at Godown" : modalType === "dispatch" ? "Dispatch Products to Office" : "Edit Movement"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>}

          {/* Stock hint for dispatch */}
          {modalType === "dispatch" && stock.length > 0 && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#15803D" }}>Available in godown:</p>
              <div className="flex flex-wrap gap-2">
                {stock.map(s => (
                  <span key={s.id} className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: s.available > 0 ? "#DCFCE7" : "#FEE2E2", color: s.available > 0 ? "#166534" : "#991B1B" }}>
                    {s.name}: <strong>{s.available}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {modalType !== "edit" && (
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product *</label>
                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="input">
                  <option value="">Choose…</option>
                  {(modalType === "dispatch" ? dispatchableProducts.map(s => ({ id: s.id, name: `${s.name} (avail: ${s.available})` })) : products).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {modalType === "edit" && (
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Product</label>
                <input value={editTarget?.product.name} disabled className="input opacity-60" />
              </div>
            )}
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Quantity *</label>
              <input type="number" min="1" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })}
                placeholder="0" className="input text-center text-lg font-bold"
                style={{ color: modalType === "dispatch" ? "#7C3AED" : "#2563EB" }} />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Batch / Ref No/HSN No.</label>
              <input value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })} placeholder="e.g., LOT-001" className="input" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input resize-none" placeholder="Optional remarks…" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setModalType(null); setError(""); }} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Saving…" : modalType === "edit" ? "Update" : modalType === "receive" ? "Record Receipt" : "Dispatch"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
