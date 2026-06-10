"use client";

import { useState, useTransition } from "react";
import { applyForLeave, cancelLeave } from "@/app/actions/leave";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Plus,
  AlertTriangle, Trash2, FileText, CalendarRange,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  reviewedBy: { name: string } | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "CASUAL",    label: "Casual Leave",    color: "bg-blue-100 text-blue-700" },
  { value: "SICK",      label: "Sick Leave",       color: "bg-red-100 text-red-700" },
  { value: "EARNED",    label: "Earned Leave",     color: "bg-green-100 text-green-700" },
  { value: "HALF_DAY",  label: "Half Day",         color: "bg-purple-100 text-purple-700" },
  { value: "EMERGENCY", label: "Emergency Leave",  color: "bg-orange-100 text-orange-700" },
  { value: "MATERNITY", label: "Maternity Leave",  color: "bg-pink-100 text-pink-700" },
  { value: "PATERNITY", label: "Paternity Leave",  color: "bg-indigo-100 text-indigo-700" },
  { value: "UNPAID",    label: "Unpaid Leave",     color: "bg-slate-100 text-slate-700" },
];

const STATUS_STYLES: Record<string, { chip: string; icon: React.ReactNode }> = {
  PENDING:  { chip: "bg-amber-100 text-amber-700",  icon: <Clock className="w-3 h-3" /> },
  APPROVED: { chip: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-3 h-3" /> },
  REJECTED: { chip: "bg-red-100 text-red-700",      icon: <XCircle className="w-3 h-3" /> },
};

function leaveTypeLabel(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;
}
function leaveTypeColor(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type)?.color ?? "bg-slate-100 text-slate-700";
}

function calculateDays(start: string, end: string, type: string): number {
  if (type === "HALF_DAY") return 0.5;
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeLeaveClient({
  initialLeaves,
  employeeName,
}: {
  initialLeaves: LeaveRecord[];
  employeeName: string;
}) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [viewLeave, setViewLeave] = useState<LeaveRecord | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const days = calculateDays(startDate, endDate, leaveType);

  // Stats
  const pending  = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;
  const totalDaysApproved = leaves
    .filter((l) => l.status === "APPROVED")
    .reduce((s, l) => s + l.totalDays, 0);

  function resetForm() {
    setLeaveType("CASUAL");
    setStartDate("");
    setEndDate("");
    setReason("");
    setError("");
  }

  function handleSubmit() {
    setError("");
    if (!startDate || !endDate) { setError("Please select start and end dates"); return; }
    if (!reason.trim()) { setError("Please enter a reason for your leave"); return; }
    if (days <= 0) { setError("End date must be on or after start date"); return; }

    startTransition(async () => {
      const result = await applyForLeave({ leaveType, startDate, endDate, totalDays: days, reason });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result.leave) {
        setLeaves((prev) => [result.leave as LeaveRecord, ...prev]);
        setSuccess("Leave request submitted successfully!");
        setShowForm(false);
        resetForm();
        setTimeout(() => setSuccess(""), 4000);
      }
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelLeave(id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setLeaves((prev) => prev.filter((l) => l.id !== id));
      setCancelId(null);
      setSuccess("Leave request cancelled.");
      setTimeout(() => setSuccess(""), 3000);
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            Leave Management
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            Apply for leave and track your request status
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
          style={{ background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
          <p className="text-[13px] font-medium" style={{ color: "#15803D" }}>{success}</p>
        </div>
      )}

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pending",        val: pending,           color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
          { label: "Approved",       val: approved,          color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
          { label: "Rejected",       val: rejected,          color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
          { label: "Days Approved",  val: totalDaysApproved, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
        ].map(({ label, val, color, bg, border }) => (
          <div key={label} className="rounded-xl px-4 py-3.5"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "#71717A" }}>{label}</p>
            <p className="text-[22px] font-bold leading-none" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Apply form (inline collapsible) ──────────────────────── */}
      {showForm && (
        <div className="rounded-xl mb-6 overflow-hidden"
          style={{ background: "#fff", border: "1px solid #BFDBFE", boxShadow: "0 2px 8px rgba(37,99,235,0.08)" }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE" }}>
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4" style={{ color: "#2563EB" }} />
              <p className="text-[14px] font-semibold" style={{ color: "#1D4ED8" }}>New Leave Application</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-[20px] leading-none"
              style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
              ×
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
                <p className="text-[13px]" style={{ color: "#B91C1C" }}>{error}</p>
              </div>
            )}

            {/* Leave type */}
            <div>
              <label className="block text-[13px] font-semibold mb-2" style={{ color: "#374151" }}>
                Leave Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LEAVE_TYPES.map((t) => (
                  <button key={t.value}
                    onClick={() => {
                      setLeaveType(t.value);
                      if (t.value === "HALF_DAY") setEndDate(startDate);
                    }}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium text-left transition-all"
                    style={leaveType === t.value
                      ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                      : { background: "#F4F4F5", color: "#52525B", border: "1px solid #E4E4E7", cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Start Date *
                </label>
                <input
                  type="date" value={startDate} min={today}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (leaveType === "HALF_DAY") setEndDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="input" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  End Date *
                </label>
                <input
                  type="date" value={endDate} min={startDate || today}
                  disabled={leaveType === "HALF_DAY"}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input" style={leaveType === "HALF_DAY" ? { opacity: 0.5 } : {}} />
              </div>
              <div className="flex flex-col justify-end">
                <div className="rounded-lg px-4 py-3 text-center"
                  style={{ background: days > 0 ? "#EFF6FF" : "#F4F4F5", border: "1px solid #E4E4E7" }}>
                  <p className="text-[11px] font-medium mb-0.5" style={{ color: "#71717A" }}>Duration</p>
                  <p className="text-[20px] font-bold" style={{ color: days > 0 ? "#2563EB" : "#A1A1AA" }}>
                    {days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for your leave request (minimum 10 characters)…"
                rows={3}
                className="input resize-none"
              />
              <p className="text-[11px] mt-1" style={{ color: reason.length < 10 && reason.length > 0 ? "#DC2626" : "#A1A1AA" }}>
                {reason.length}/500 characters
              </p>
            </div>

            {/* Submit row */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={isPending || !startDate || !endDate || !reason.trim() || days <= 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={{ background: "#2563EB", color: "#fff", border: "none", cursor: "pointer",
                  opacity: (isPending || !startDate || !endDate || !reason.trim() || days <= 0) ? 0.5 : 1 }}>
                <CalendarDays className="w-4 h-4" />
                {isPending ? "Submitting…" : "Submit Leave Request"}
              </button>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium"
                style={{ background: "#F4F4F5", color: "#52525B", border: "1px solid #E4E4E7", cursor: "pointer" }}>
                Cancel
              </button>
              {days > 0 && (
                <span className="text-[12px]" style={{ color: "#71717A" }}>
                  {leaveType === "HALF_DAY" ? "Half day" : `${days} day${days !== 1 ? "s" : ""}`} — {leaveTypeLabel(leaveType)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Leave history table ───────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid #E4E4E7" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
            My Leave Requests
          </p>
          <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{leaves.length} requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Reviewed By</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                    <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No leave requests yet</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>
                      Click &quot;Apply for Leave&quot; to submit your first request
                    </p>
                  </td>
                </tr>
              ) : leaves.map((leave) => {
                const st = STATUS_STYLES[leave.status] ?? STATUS_STYLES.PENDING;
                return (
                  <tr key={leave.id}>
                    <td>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveTypeColor(leave.leaveType)}`}>
                        {leaveTypeLabel(leave.leaveType)}
                      </span>
                    </td>
                    <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(leave.startDate)}</td>
                    <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(leave.endDate)}</td>
                    <td>
                      <span className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                        {leave.totalDays}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <p className="text-[12px] truncate" style={{ color: "#52525B" }}>{leave.reason}</p>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${st.chip}`}>
                        {st.icon} {leave.status}
                      </span>
                      {leave.status === "REJECTED" && leave.reviewNote && (
                        <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#DC2626" }}>
                          {leave.reviewNote}
                        </p>
                      )}
                    </td>
                    <td className="text-[12px]" style={{ color: "#52525B" }}>
                      {leave.reviewedBy ? (
                        <div>
                          <p>{leave.reviewedBy.name}</p>
                          {leave.reviewedAt && (
                            <p style={{ color: "#A1A1AA" }}>{formatDate(leave.reviewedAt)}</p>
                          )}
                        </div>
                      ) : <span style={{ color: "#A1A1AA" }}>—</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewLeave(leave)}
                          title="View details"
                          style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                            width:30, height:30, borderRadius:6, border:"1px solid #E4E4E7",
                            background:"#fff", color:"#52525B", cursor:"pointer" }}>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {leave.status === "PENDING" && (
                          <button
                            onClick={() => setCancelId(leave.id)}
                            title="Cancel request"
                            style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                              width:30, height:30, borderRadius:6, border:"1px solid #FCA5A5",
                              background:"#FEF2F2", color:"#DC2626", cursor:"pointer" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View detail modal ─────────────────────────────────────── */}
      <Modal open={!!viewLeave} onClose={() => setViewLeave(null)} title="Leave Request Details" size="md">
        {viewLeave && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${leaveTypeColor(viewLeave.leaveType)}`}>
                  {leaveTypeLabel(viewLeave.leaveType)}
                </span>
                <p className="text-[12px] mt-2" style={{ color: "#71717A" }}>
                  Applied on {formatDate(viewLeave.createdAt)}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[viewLeave.status]?.chip ?? ""}`}>
                {STATUS_STYLES[viewLeave.status]?.icon} {viewLeave.status}
              </span>
            </div>

            <div className="rounded-xl divide-y" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
              {[
                ["Start Date",  formatDate(viewLeave.startDate)],
                ["End Date",    formatDate(viewLeave.endDate)],
                ["Duration",    `${viewLeave.totalDays} day${viewLeave.totalDays !== 1 ? "s" : ""}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>{label}</span>
                  <span className="font-medium" style={{ color: "#18181B" }}>{value}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[12px] font-semibold mb-1.5" style={{ color: "#374151" }}>Reason</p>
              <div className="px-4 py-3 rounded-xl text-[13px]"
                style={{ background: "#F4F4F5", border: "1px solid #E4E4E7", color: "#374151", lineHeight: 1.6 }}>
                {viewLeave.reason}
              </div>
            </div>

            {viewLeave.reviewedBy && (
              <div className="px-4 py-3 rounded-xl text-[13px] space-y-1.5"
                style={{ background: viewLeave.status === "APPROVED" ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${viewLeave.status === "APPROVED" ? "#86EFAC" : "#FCA5A5"}` }}>
                <p className="font-semibold" style={{ color: viewLeave.status === "APPROVED" ? "#15803D" : "#B91C1C" }}>
                  {viewLeave.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"} by {viewLeave.reviewedBy.name}
                </p>
                {viewLeave.reviewNote && (
                  <p style={{ color: "#52525B" }}>{viewLeave.reviewNote}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Cancel confirm modal ──────────────────────────────────── */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Leave Request" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#DC2626" }} />
            <p className="text-[13px]" style={{ color: "#B91C1C" }}>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCancelId(null)}
              className="btn btn-secondary flex-1 justify-center">
              Keep it
            </button>
            <button
              onClick={() => cancelId && handleCancel(cancelId)}
              disabled={isPending}
              className="btn btn-danger flex-1 justify-center">
              {isPending ? "Cancelling…" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
