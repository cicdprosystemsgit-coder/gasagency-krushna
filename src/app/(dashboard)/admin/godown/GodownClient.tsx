"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { formatDateTime } from "@/lib/utils";
import { Plus, Truck, Package, ArrowUpDown, CheckCircle2 } from "lucide-react";
import { createGodownRecord, approveGodownRecord } from "@/app/actions/godown";

interface GodownRecord {
  id: string; vehicleNo: string; entryDate: Date | string;
  filledCylindersReceived: number; emptyCylindersReturned: number;
  notes: string | null; status: string;
  submittedBy: { name: string };
}

interface GodownClientProps {
  initialRecords: GodownRecord[];
  totalFilled: number; totalEmpty: number;
  isAdmin: boolean; userId: string;
}

export function GodownClient({ initialRecords, totalFilled, totalEmpty, isAdmin, userId }: GodownClientProps) {
  const [records, setRecords] = useState(initialRecords);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ vehicleNo: "", entryDate: new Date().toISOString().slice(0, 16), filledCylindersReceived: "", emptyCylindersReturned: "", notes: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleNo.trim()) { setError("Vehicle number required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("submittedById", userId);
    startTransition(async () => {
      const result = await createGodownRecord(fd);
      if (result.error) { setError(result.error); return; }
      if (result.record) { setRecords((prev) => [result.record!, ...prev]); setModalOpen(false); setForm({ vehicleNo: "", entryDate: new Date().toISOString().slice(0, 16), filledCylindersReceived: "", emptyCylindersReturned: "", notes: "" }); }
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approveGodownRecord(id);
      if (result.success) setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "APPROVED" } : r));
    });
  }

  const todayCount = records.filter((r) => new Date(r.entryDate).toDateString() === new Date().toDateString()).length;
  const pendingCount = records.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatsCard title="Total Filled Received" value={totalFilled} subtitle="All time (approved)" icon={<Package className="w-4 h-4" />} color="blue" />
        <StatsCard title="Total Empty Returned" value={totalEmpty} subtitle="All time (approved)" icon={<ArrowUpDown className="w-4 h-4" />} color="orange" />
        <StatsCard title="Today's Arrivals" value={todayCount} subtitle="Vehicles today" icon={<Truck className="w-4 h-4" />} color="green" />
        <StatsCard title="Pending Approval" value={pendingCount} subtitle="Awaiting review" icon={<CheckCircle2 className="w-4 h-4" />} color={pendingCount > 0 ? "orange" : "green"} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Vehicle entry records</p>
        <button onClick={() => { setError(""); setModalOpen(true); }} className="btn btn-primary">
          <Plus className="w-3.5 h-3.5" /> Record vehicle entry
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle no.</th>
                <th>Date & time</th>
                <th className="text-center">Filled in</th>
                <th className="text-center">Empty out</th>
                <th>Submitted by</th>
                <th>Notes</th>
                <th className="text-center">Status</th>
                {isAdmin && <th className="text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="py-14 text-center">
                  <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                  <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No vehicle records yet</p>
                </td></tr>
              ) : records.map((r) => (
                <tr key={r.id}>
                  <td><span className="font-mono text-[13px] font-semibold" style={{ color: "#18181B" }}>{r.vehicleNo}</span></td>
                  <td className="muted text-[12px]">{formatDateTime(r.entryDate)}</td>
                  <td className="text-center"><span className="text-[15px] font-bold" style={{ color: "#2563EB" }}>{r.filledCylindersReceived}</span></td>
                  <td className="text-center"><span className="text-[15px] font-bold" style={{ color: "#D97706" }}>{r.emptyCylindersReturned}</span></td>
                  <td className="muted text-[13px]">{r.submittedBy.name}</td>
                  <td className="muted text-[12px]">{r.notes ?? "—"}</td>
                  <td className="text-center"><StatusBadge status={r.status} /></td>
                  {isAdmin && (
                    <td className="text-center">
                      {r.status === "PENDING" && (
                        <button onClick={() => handleApprove(r.id)} disabled={isPending} className="btn btn-secondary text-[12px]" style={{ height: 28, padding: "0 10px", color: "#16A34A", borderColor: "#86EFAC" }}>
                          Approve
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record vehicle entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Vehicle number *</label>
            <input value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} placeholder="MH12AB1234" className="input font-mono" style={{ textTransform: "uppercase" }} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Date & time of entry *</label>
            <input type="datetime-local" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Filled cylinders received *</label>
              <input type="number" min="0" value={form.filledCylindersReceived} onChange={(e) => setForm({ ...form, filledCylindersReceived: e.target.value })} placeholder="0" className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Empty cylinders returned</label>
              <input type="number" min="0" value={form.emptyCylindersReturned} onChange={(e) => setForm({ ...form, emptyCylindersReturned: e.target.value })} placeholder="0" className="input" />
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>Loaded back to return to Bharat Gas</p>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input resize-none" />
          </div>
          <p className="text-[12px] px-3 py-2.5 rounded-md" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
            This entry will be submitted for Manager approval.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : "Submit entry"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
