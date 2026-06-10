"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";
import {
  Package, ArrowDownToLine, ArrowUpFromLine, Plus,
  Boxes, TrendingUp, TrendingDown, Calendar,
} from "lucide-react";
import { receiveGodownStock, dispatchToOffice } from "@/app/actions/godown-inventory";

interface Movement {
  id: string;
  date: Date | string;
  moveType: "RECEIVED" | "DISPATCHED";
  qty: number;
  batchNo: string | null;
  notes: string | null;
  product: { id: string; name: string };
  recordedBy: { name: string };
}

interface Product {
  id: string;
  name: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>
      {children}
    </label>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
      {msg}
    </div>
  );
}

// Compute net stock per product from movements
function computeStock(movements: Movement[]) {
  const map: Record<string, { name: string; received: number; dispatched: number }> = {};
  movements.forEach(m => {
    if (!map[m.product.id]) map[m.product.id] = { name: m.product.name, received: 0, dispatched: 0 };
    if (m.moveType === "RECEIVED")   map[m.product.id].received   += m.qty;
    if (m.moveType === "DISPATCHED") map[m.product.id].dispatched += m.qty;
  });
  return Object.entries(map).map(([id, v]) => ({ id, ...v, available: v.received - v.dispatched }));
}

export function GodownInventoryTab({
  initialMovements,
  products,
  userId,
  selectedMonth,
}: {
  initialMovements: Movement[];
  products: Product[];
  userId: string;
  selectedMonth: string;
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [receiveModal, setReceiveModal] = useState(false);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [view, setView] = useState<"stock" | "history">("stock");

  const [rForm, setRForm] = useState({ productId: "", qty: "", batchNo: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [dForm, setDForm] = useState({ productId: "", qty: "", notes: "", date: new Date().toISOString().slice(0, 10) });

  // Filter movements to selected month
  const filteredMovements = movements.filter(m => {
    const d = new Date(m.date).toLocaleDateString("en-CA");
    return d.slice(0, 7) === selectedMonth;
  });

  const stockLevels = computeStock(movements); // always from ALL movements for correct balance

  function submitReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!rForm.productId) { setError("Select a product"); return; }
    if (!rForm.qty || Number(rForm.qty) <= 0) { setError("Enter a valid quantity"); return; }
    const fd = new FormData();
    Object.entries(rForm).forEach(([k, v]) => fd.append(k, v));
    fd.append("recordedById", userId);
    startTransition(async () => {
      const res = await receiveGodownStock(fd);
      if (res.error) { setError(res.error); return; }
      if (res.record) {
        setMovements(p => [res.record! as Movement, ...p]);
        setReceiveModal(false);
        setRForm({ productId: "", qty: "", batchNo: "", notes: "", date: new Date().toISOString().slice(0, 10) });
        setError("");
      }
    });
  }

  function submitDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dForm.productId) { setError("Select a product"); return; }
    if (!dForm.qty || Number(dForm.qty) <= 0) { setError("Enter a valid quantity"); return; }
    const fd = new FormData();
    Object.entries(dForm).forEach(([k, v]) => fd.append(k, v));
    fd.append("recordedById", userId);
    startTransition(async () => {
      const res = await dispatchToOffice(fd);
      if (res.error) { setError(res.error); return; }
      if (res.record) {
        setMovements(p => [res.record! as Movement, ...p]);
        setDispatchModal(false);
        setDForm({ productId: "", qty: "", notes: "", date: new Date().toISOString().slice(0, 10) });
        setError("");
      }
    });
  }

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const [y, m] = selectedMonth.split("-");
  const monthLabel = `${MONTHS[Number(m) - 1]} ${y}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: "#18181B" }}>
            Inventory — {monthLabel}
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>
            Manage product stock: receive from company, dispatch to office
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setError(""); setReceiveModal(true); }}
            className="btn btn-primary"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" /> Receive Stock
          </button>
          <button
            onClick={() => { setError(""); setDispatchModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Dispatch to Office
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F4F4F5" }}>
        {(["stock", "history"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all"
            style={view === v
              ? { background: "#fff", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { background: "transparent", color: "#71717A" }
            }
          >
            {v === "stock" ? "📦 Current Stock" : "📋 Movement History"}
          </button>
        ))}
      </div>

      {/* Stock levels view */}
      {view === "stock" && (
        <div className="space-y-2">
          {stockLevels.length === 0 ? (
            <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
              <Boxes className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No inventory recorded yet</p>
              <p className="text-[12px] mt-1" style={{ color: "#A1A1AA" }}>Click "Receive Stock" to log the first product arrival</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
              <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Current Stock Levels (All Time)</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>Net available = total received − dispatched to office</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                    {["Product", "Total Received", "Dispatched to Office", "Net Available"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < stockLevels.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                            <Package className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                          <span className="font-bold text-[15px]" style={{ color: "#2563EB" }}>{s.received}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                          <span className="font-bold text-[15px]" style={{ color: "#16A34A" }}>{s.dispatched}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-[14px]"
                          style={{
                            background: s.available > 0 ? "#F0FDF4" : "#FEF2F2",
                            color: s.available > 0 ? "#15803D" : "#B91C1C",
                          }}
                        >
                          {s.available}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Movement history view — grouped by day */}
      {view === "history" && (
        <div className="space-y-3">
          {filteredMovements.length === 0 ? (
            <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No movements in {monthLabel}</p>
            </div>
          ) : (
            (() => {
              // Group by day
              const byDay = new Map<string, Movement[]>();
              filteredMovements.forEach(m => {
                const day = new Date(m.date).toLocaleDateString("en-CA");
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day)!.push(m);
              });
              return Array.from(byDay.entries()).map(([day, items]) => {
                const dayLabel = new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                const received   = items.filter(m => m.moveType === "RECEIVED").reduce((a, m) => a + m.qty, 0);
                const dispatched = items.filter(m => m.moveType === "DISPATCHED").reduce((a, m) => a + m.qty, 0);
                return (
                  <div key={day} className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                        <span className="text-[12px] font-bold" style={{ color: "#18181B" }}>{dayLabel}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#2563EB" }}>{items.length} movement{items.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex gap-3 text-[11px]">
                        {received   > 0 && <span style={{ color: "#2563EB" }}>↓ Received: {received}</span>}
                        {dispatched > 0 && <span style={{ color: "#16A34A" }}>↑ Dispatched: {dispatched}</span>}
                      </div>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #F4F4F5" }}>
                          {["Product", "Type", "Qty", "Batch / Ref", "Notes", "Recorded By", "Time"].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: i < items.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2563EB" }} />
                                <span className="text-[12px] font-medium" style={{ color: "#18181B" }}>{m.product.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={m.moveType === "RECEIVED"
                                  ? { background: "#EFF6FF", color: "#1D4ED8" }
                                  : { background: "#F0FDF4", color: "#15803D" }
                                }>
                                {m.moveType === "RECEIVED" ? "↓ Received" : "↑ To Office"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-bold text-[14px]" style={{ color: m.moveType === "RECEIVED" ? "#2563EB" : "#16A34A" }}>{m.qty}</td>
                            <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>{m.batchNo || "—"}</td>
                            <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>{m.notes || "—"}</td>
                            <td className="px-4 py-2.5 text-[12px]" style={{ color: "#52525B" }}>{m.recordedBy.name}</td>
                            <td className="px-4 py-2.5 text-[11px]" style={{ color: "#71717A" }}>
                              {new Date(m.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* ── Modal: Receive Stock ── */}
      <Modal open={receiveModal} onClose={() => setReceiveModal(false)} title="Receive Stock at Godown">
        <form onSubmit={submitReceive} className="space-y-4">
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Product *</FieldLabel>
              <select value={rForm.productId} onChange={e => setRForm({ ...rForm, productId: e.target.value })} className="input">
                <option value="">Choose product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Date *</FieldLabel>
              <input type="date" value={rForm.date} onChange={e => setRForm({ ...rForm, date: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Quantity *</FieldLabel>
              <input type="number" min="1" value={rForm.qty} onChange={e => setRForm({ ...rForm, qty: e.target.value })} placeholder="0" className="input text-center text-lg font-bold" style={{ color: "#2563EB" }} />
            </div>
            <div>
              <FieldLabel>Batch / Ref No.</FieldLabel>
              <input value={rForm.batchNo} onChange={e => setRForm({ ...rForm, batchNo: e.target.value })} placeholder="e.g., LOT-001" className="input" />
            </div>
          </div>
          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea value={rForm.notes} onChange={e => setRForm({ ...rForm, notes: e.target.value })} rows={2} className="input resize-none" placeholder="Any remarks…" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReceiveModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : "Record Receipt"}</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Dispatch to Office ── */}
      <Modal open={dispatchModal} onClose={() => setDispatchModal(false)} title="Dispatch Products to Office">
        <form onSubmit={submitDispatch} className="space-y-4">
          {error && <ErrorBanner msg={error} />}
          {/* Stock quick-reference */}
          {stockLevels.length > 0 && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#15803D" }}>Available stock in godown:</p>
              <div className="flex flex-wrap gap-2">
                {stockLevels.map(s => (
                  <span key={s.id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: s.available > 0 ? "#DCFCE7" : "#FEE2E2", color: s.available > 0 ? "#166534" : "#991B1B" }}>
                    {s.name}: <strong>{s.available}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Product *</FieldLabel>
              <select value={dForm.productId} onChange={e => setDForm({ ...dForm, productId: e.target.value })} className="input">
                <option value="">Choose product…</option>
                {stockLevels.filter(s => s.available > 0).map(s => (
                  <option key={s.id} value={s.id}>{s.name} (avail: {s.available})</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Date *</FieldLabel>
              <input type="date" value={dForm.date} onChange={e => setDForm({ ...dForm, date: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <FieldLabel>Quantity to dispatch *</FieldLabel>
            <input type="number" min="1" value={dForm.qty} onChange={e => setDForm({ ...dForm, qty: e.target.value })} placeholder="0" className="input text-center text-lg font-bold" style={{ color: "#16A34A" }} />
          </div>
          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea value={dForm.notes} onChange={e => setDForm({ ...dForm, notes: e.target.value })} rows={2} className="input resize-none" placeholder="e.g., Morning batch for office" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDispatchModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Dispatching…" : "Dispatch to Office"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
