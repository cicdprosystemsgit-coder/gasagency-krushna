"use client";

import { useState } from "react";
import {
  ArrowDownToLine, Package, Calendar, TrendingDown, TrendingUp,
  Boxes, ChevronDown, ChevronUp,
} from "lucide-react";

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

// Compute net stock per product
function computeStock(movements: Movement[]) {
  const map: Record<string, { name: string; received: number; dispatched: number }> = {};
  movements.forEach(m => {
    if (!map[m.product.id]) map[m.product.id] = { name: m.product.name, received: 0, dispatched: 0 };
    if (m.moveType === "RECEIVED")   map[m.product.id].received   += m.qty;
    if (m.moveType === "DISPATCHED") map[m.product.id].dispatched += m.qty;
  });
  return Object.entries(map).map(([id, v]) => ({ id, ...v, inOffice: v.dispatched }));
}

interface Props {
  movements: Movement[];
}

export function OfficeInventorySection({ movements }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Only dispatched movements = what has arrived in office from godown
  const dispatched = movements.filter(m => m.moveType === "DISPATCHED");
  const stockLevels = computeStock(movements);

  // Group dispatched by month for history
  const byMonth = new Map<string, Movement[]>();
  dispatched.forEach(m => {
    const key = new Date(m.date).toLocaleDateString("en-CA").slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(m);
  });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function fmtMonth(ym: string) {
    const [y, mo] = ym.split("-");
    return `${MONTHS[Number(mo) - 1]} ${y}`;
  }

  const totalReceived = dispatched.reduce((a, m) => a + m.qty, 0);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Section header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? "1px solid #F4F4F5" : "none" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
            <ArrowDownToLine className="w-4 h-4" style={{ color: "#2563EB" }} />
          </div>
          <div className="text-left">
            <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Stock Received from Godown</p>
            <p className="text-[12px]" style={{ color: "#71717A" }}>Products dispatched from godown to this office</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            {totalReceived} units received
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "#A1A1AA" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A1A1AA" }} />}
        </div>
      </button>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Stock summary cards */}
          {stockLevels.length === 0 ? (
            <div className="py-10 text-center rounded-xl" style={{ background: "#FAFAFA", border: "1px dashed #E4E4E7" }}>
              <Boxes className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
              <p className="text-[13px]" style={{ color: "#71717A" }}>No stock received from godown yet</p>
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>Godown keeper must dispatch products to office first</p>
            </div>
          ) : (
            <>
              {/* Per-product cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {stockLevels.map(s => (
                  <div key={s.id} className="rounded-xl p-4" style={{ background: "#F8FAFC", border: "1px solid #E4E4E7" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                        <Package className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: "#18181B" }}>{s.name}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: "#71717A" }}>
                          <TrendingDown className="w-3 h-3" style={{ color: "#2563EB" }} />
                          <span>Received at office</span>
                        </div>
                        <span className="font-bold text-[15px]" style={{ color: "#2563EB" }}>{s.inOffice}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent dispatches table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold" style={{ color: "#52525B" }}>Recent Dispatches</p>
                  <button
                    onClick={() => setHistoryOpen(h => !h)}
                    className="text-[11px] font-medium"
                    style={{ color: "#2563EB" }}
                  >
                    {historyOpen ? "Hide full history ↑" : "Show full history ↓"}
                  </button>
                </div>

                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #F4F4F5" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                        {["Date", "Product", "Qty", "Batch / Ref", "Notes", "By"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(historyOpen ? dispatched : dispatched.slice(0, 5)).map((m, i) => (
                        <tr key={m.id} style={{ borderBottom: i < (historyOpen ? dispatched.length : Math.min(dispatched.length, 5)) - 1 ? "1px solid #F4F4F5" : "none" }}>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: "#71717A" }}>
                            {new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3 h-3 flex-shrink-0" style={{ color: "#2563EB" }} />
                              <span className="text-[12px] font-medium" style={{ color: "#18181B" }}>{m.product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-[13px]" style={{ color: "#2563EB" }}>{m.qty}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>{m.batchNo || "—"}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>{m.notes || "—"}</td>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: "#52525B" }}>{m.recordedBy.name}</td>
                        </tr>
                      ))}
                      {dispatched.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[12px]" style={{ color: "#A1A1AA" }}>No dispatches recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Month-grouped summary (only when history is open) */}
                {historyOpen && byMonth.size > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>Month-wise Summary</p>
                    {Array.from(byMonth.entries()).map(([ym, items]) => {
                      const total = items.reduce((a, m) => a + m.qty, 0);
                      return (
                        <div key={ym} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #F4F4F5" }}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                            <span className="text-[12px] font-medium" style={{ color: "#18181B" }}>{fmtMonth(ym)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span style={{ color: "#71717A" }}>{items.length} dispatch{items.length > 1 ? "es" : ""}</span>
                            <span className="font-bold" style={{ color: "#2563EB" }}>{total} units</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
