"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatDateTime, ROLE_LABELS } from "@/lib/utils";
import {
  CheckCircle2, XCircle, RotateCcw, Eye, BookOpen,
  Wallet, ShieldCheck, Clock, Send, CalendarDays, AlertTriangle,
} from "lucide-react";
import { approveOrRejectSummary } from "@/app/actions/approvals";
import { approveSalaryRequest, rejectSalaryRequest } from "@/app/actions/salary-requests";
import { reviewLeave } from "@/app/actions/leave";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  id: string;
  date: Date | string;
  status: string;
  managerNote: string | null;
  managerApprovedAt: Date | string | null;
  adminApprovedAt: Date | string | null;
  summaryData: unknown;
  submittedBy: { name: string; role: string };
  approvedByManager: { name: string } | null;
  approvedByAdmin: { name: string } | null;
  createdAt: Date | string;
}

interface SalaryRequest {
  id: string;
  type: string;
  amount: number;
  month: number | null;
  year: number | null;
  status: string;
  remarks: string | null;
  reviewNote: string | null;
  requestData: Record<string, unknown>;
  employeeId: string;
  employee: { name: string; role: string };
  requestedBy: { name: string; role: string };
  reviewedBy: { name: string } | null;
  createdAt: Date | string;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  employee: { id: string; name: string; role: string };
  reviewedBy: { name: string } | null;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SUMMARY_FILTERS = ["PENDING", "APPROVED", "REJECTED", "CORRECTION_NEEDED", "ALL"] as const;
const SALARY_FILTERS  = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;
const LEAVE_FILTERS   = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

const LEAVE_TYPE_META: Record<string, { label: string; color: string }> = {
  CASUAL:    { label: "Casual Leave",    color: "bg-blue-100 text-blue-700" },
  SICK:      { label: "Sick Leave",      color: "bg-red-100 text-red-700" },
  EARNED:    { label: "Earned Leave",    color: "bg-green-100 text-green-700" },
  HALF_DAY:  { label: "Half Day",        color: "bg-purple-100 text-purple-700" },
  EMERGENCY: { label: "Emergency Leave", color: "bg-orange-100 text-orange-700" },
  MATERNITY: { label: "Maternity Leave", color: "bg-pink-100 text-pink-700" },
  PATERNITY: { label: "Paternity Leave", color: "bg-indigo-100 text-indigo-700" },
  UNPAID:    { label: "Unpaid Leave",    color: "bg-slate-100 text-slate-700" },
};

const TYPE_COLORS: Record<string, string> = {
  SALARY:           "bg-blue-100 text-blue-700",
  DRAWING:          "bg-orange-100 text-orange-700",
  ADVANCE:          "bg-red-100 text-red-700",
  ADVANCE_RECOVERY: "bg-emerald-100 text-emerald-700",
  BONUS:            "bg-purple-100 text-purple-700",
};

const REQUEST_STATUS: Record<string, { label: string; chip: string }> = {
  PENDING:  { label: "⏳ Pending",  chip: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "✓ Approved", chip: "bg-green-100 text-green-700" },
  REJECTED: { label: "✗ Rejected", chip: "bg-red-100 text-red-700" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalsClient({
  initialSummaries,
  initialSalaryRequests,
  initialLeaveRequests,
  role,
  userId,
}: {
  initialSummaries: Summary[];
  initialSalaryRequests: SalaryRequest[];
  initialLeaveRequests: LeaveRequest[];
  role: string;
  userId: string;
}) {
  const [activeTab, setActiveTab] = useState<"daily" | "salary" | "leave">("daily");

  const [summaries, setSummaries]           = useState(initialSummaries);
  const [salaryRequests, setSalaryRequests] = useState(initialSalaryRequests);
  const [leaveRequests, setLeaveRequests]   = useState(initialLeaveRequests);

  const pendingSummaries = summaries.filter((s) => s.status === "PENDING").length;
  const pendingSalary    = salaryRequests.filter((r) => r.status === "PENDING").length;
  const pendingLeave     = leaveRequests.filter((l) => l.status === "PENDING").length;

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <TabBtn
          label="Daily Summaries"
          badge={pendingSummaries}
          active={activeTab === "daily"}
          onClick={() => setActiveTab("daily")}
        />
        <TabBtn
          label="Salary Requests"
          badge={pendingSalary}
          active={activeTab === "salary"}
          onClick={() => setActiveTab("salary")}
        />
        <TabBtn
          label="Leave Requests"
          badge={pendingLeave}
          active={activeTab === "leave"}
          onClick={() => setActiveTab("leave")}
        />
      </div>

      {activeTab === "daily" && (
        <DailySummariesSection
          summaries={summaries}
          role={role}
          userId={userId}
          onUpdate={(updated) =>
            setSummaries((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      )}

      {activeTab === "salary" && (
        <SalaryRequestsSection
          requests={salaryRequests}
          role={role}
          onUpdate={(updated) =>
            setSalaryRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
          }
        />
      )}

      {activeTab === "leave" && (
        <LeaveRequestsSection
          requests={leaveRequests}
          role={role}
          onUpdate={(updated) =>
            setLeaveRequests((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
          }
        />
      )}
    </>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  label, badge, active, onClick,
}: {
  label: string; badge: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Section 1: Daily Summaries ───────────────────────────────────────────────

function DailySummariesSection({
  summaries, role, userId, onUpdate,
}: {
  summaries: Summary[];
  role: string;
  userId: string;
  onUpdate: (s: Summary) => void;
}) {
  const [viewSummary, setViewSummary] = useState<Summary | null>(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [filter, setFilter] = useState<typeof SUMMARY_FILTERS[number]>("PENDING");

  const filtered = filter === "ALL" ? summaries : summaries.filter((s) => s.status === filter);

  function doAction(id: string, action: string, note?: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("action", action);
      fd.append("userId", userId);
      if (note) fd.append("note", note);
      const result = await approveOrRejectSummary(fd);
      if (result.success) {
        const target = summaries.find((s) => s.id === id);
        if (target) {
          onUpdate({
            ...target,
            status: action === "REJECT" ? "REJECTED" : action === "CORRECTION_NEEDED" ? "CORRECTION_NEEDED" : "APPROVED",
            managerNote: note ?? target.managerNote,
            managerApprovedAt: action === "MANAGER_APPROVE" ? new Date().toISOString() : target.managerApprovedAt,
            adminApprovedAt:   action === "ADMIN_APPROVE"   ? new Date().toISOString() : target.adminApprovedAt,
          });
        }
      }
    });
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {SUMMARY_FILTERS.map((f) => {
          const count = f === "ALL" ? summaries.length : summaries.filter((s) => s.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className="btn text-[12px]"
              style={filter === f
                ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                : { background: "#fff", color: "#52525B", border: "1px solid #E4E4E7" }}>
              {f.replace("_", " ")}
              <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Manager</th>
                <th>Admin</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                  <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
                    No {filter === "ALL" ? "" : filter.toLowerCase().replace(/_/g, " ")} submissions
                  </p>
                </td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: "#2563EB" }}>
                        {s.submittedBy.name.charAt(0)}
                      </div>
                      <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>{s.submittedBy.name}</span>
                    </div>
                  </td>
                  <td className="muted text-[12px]">{ROLE_LABELS[s.submittedBy.role] ?? s.submittedBy.role}</td>
                  <td className="muted text-[12px]">{formatDateTime(s.createdAt)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-[12px]">
                    {s.approvedByManager
                      ? <span style={{ color: "#16A34A" }}>✓ {s.approvedByManager.name}</span>
                      : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td className="text-[12px]">
                    {s.approvedByAdmin
                      ? <span style={{ color: "#16A34A" }}>✓ {s.approvedByAdmin.name}</span>
                      : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setViewSummary(s)} title="View details"
                        style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #E4E4E7", background:"#fff", color:"#52525B", cursor:"pointer" }}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {s.status === "PENDING" && (
                        <>
                          <button onClick={() => doAction(s.id, role === "MANAGER" ? "MANAGER_APPROVE" : "ADMIN_APPROVE")} disabled={isPending}
                            title="Approve"
                            style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #86EFAC", background:"#F0FDF4", color:"#16A34A", cursor:"pointer" }}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => doAction(s.id, "CORRECTION_NEEDED")} disabled={isPending}
                            title="Send back for correction"
                            style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #FDE68A", background:"#FFFBEB", color:"#D97706", cursor:"pointer" }}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setRejectId(s.id); setRejectNote(""); }} disabled={isPending}
                            title="Reject"
                            style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #FCA5A5", background:"#FEF2F2", color:"#DC2626", cursor:"pointer" }}>
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      <Modal open={!!viewSummary} onClose={() => setViewSummary(null)} title="Daily summary" size="lg">
        {viewSummary && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>{viewSummary.submittedBy.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>{ROLE_LABELS[viewSummary.submittedBy.role]} · {formatDate(viewSummary.date)}</p>
              </div>
              <StatusBadge status={viewSummary.status} />
            </div>
            <div className="rounded-md p-3.5 font-mono text-[12px] overflow-auto" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7", maxHeight: 220, color: "#52525B" }}>
              {JSON.stringify(viewSummary.summaryData, null, 2)}
            </div>
            {viewSummary.managerNote && (
              <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                <strong>Manager note:</strong> {viewSummary.managerNote}
              </div>
            )}
            {viewSummary.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => { doAction(viewSummary.id, role === "MANAGER" ? "MANAGER_APPROVE" : "ADMIN_APPROVE"); setViewSummary(null); }}
                  className="btn flex-1 justify-center" style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }}>
                  Approve
                </button>
                <button onClick={() => { setViewSummary(null); setRejectId(viewSummary.id); setRejectNote(""); }}
                  className="btn flex-1 justify-center btn-danger">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Reason for rejection" size="sm">
        <div className="space-y-3">
          <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Explain why this is being rejected…" rows={3} className="input resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setRejectId(null)} className="btn btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={() => { if (rejectId) { doAction(rejectId, "REJECT", rejectNote); setRejectId(null); } }}
              disabled={isPending} className="btn btn-danger flex-1 justify-center">
              Confirm reject
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Section 2: Salary Payment Requests ──────────────────────────────────────

function SalaryRequestsSection({
  requests, role, onUpdate,
}: {
  requests: SalaryRequest[];
  role: string;
  onUpdate: (r: SalaryRequest) => void;
}) {
  const [filter, setFilter]           = useState<typeof SALARY_FILTERS[number]>("PENDING");
  const [viewModal, setViewModal]     = useState<SalaryRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<SalaryRequest | null>(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [isPending, startTransition]  = useTransition();

  const isAdmin  = role === "ADMIN";
  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  const pendingTotal = requests
    .filter((r) => r.status === "PENDING")
    .reduce((s, r) => s + r.amount, 0);

  function handleApprove(id: string) {
    if (!confirm("Approve this payment? This will immediately process the salary/advance/bonus.")) return;
    startTransition(async () => {
      const result = await approveSalaryRequest(id);
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.request) onUpdate(result.request as unknown as SalaryRequest);
    });
  }

  function handleReject() {
    if (!rejectModal) return;
    if (!rejectNote.trim()) { alert("Please enter a reason for rejection."); return; }
    startTransition(async () => {
      const result = await rejectSalaryRequest(rejectModal.id, rejectNote.trim());
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.request) {
        onUpdate(result.request as unknown as SalaryRequest);
        setRejectModal(null);
        setRejectNote("");
      }
    });
  }

  return (
    <>
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Pending",  val: requests.filter((r) => r.status === "PENDING").length,  color: "#D97706", bg: "#FFFBEB" },
          { label: "Approved", val: requests.filter((r) => r.status === "APPROVED").length, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Rejected", val: requests.filter((r) => r.status === "REJECTED").length, color: "#DC2626", bg: "#FEF2F2" },
          { label: "Pending ₹", val: formatCurrency(pendingTotal), color: "#2563EB", bg: "#EFF6FF", isMoney: true },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="rounded-xl px-4 py-3" style={{ background: bg, border: `1px solid ${color}22` }}>
            <p className="text-[11px] font-medium mb-0.5" style={{ color: "#71717A" }}>{label}</p>
            <p className="text-[20px] font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Admin info banner */}
      {isAdmin && requests.filter((r) => r.status === "PENDING").length > 0 && filter === "PENDING" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "#2563EB" }} />
          <p className="text-[13px]" style={{ color: "#1D4ED8" }}>
            <strong>{requests.filter((r) => r.status === "PENDING").length} salary request{requests.filter((r) => r.status === "PENDING").length > 1 ? "s" : ""}</strong> from manager awaiting your approval.
            Approving will immediately create the payment record.
          </p>
        </div>
      )}

      {/* Manager info banner */}
      {!isAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <Send className="w-4 h-4 flex-shrink-0" style={{ color: "#D97706" }} />
          <p className="text-[13px]" style={{ color: "#92400E" }}>
            Salary payment requests you submit appear here. Admin must approve before payment is processed.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {SALARY_FILTERS.map((f) => {
          const count = f === "ALL" ? requests.length : requests.filter((r) => r.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className="btn text-[12px]"
              style={filter === f
                ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                : { background: "#fff", color: "#52525B", border: "1px solid #E4E4E7" }}>
              {f}
              <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[12px]" style={{ color: "#A1A1AA" }}>{filtered.length} requests</span>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Period</th>
                <th className="text-right">Amount</th>
                <th>Remarks</th>
                {isAdmin && <th>Requested By</th>}
                <th>Status</th>
                {isAdmin && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 7} className="py-14 text-center">
                  <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                  <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
                    {filter === "PENDING"
                      ? isAdmin ? "No pending requests — all caught up!" : "No pending requests"
                      : "No requests found"}
                  </p>
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} style={r.status === "PENDING" ? { background: "#FFFBEB" } : {}}>
                  <td className="muted text-[12px]">{formatDateTime(r.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: "#7C3AED" }}>
                        {r.employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{r.employee.name}</p>
                        <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{ROLE_LABELS[r.employee.role] ?? r.employee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="muted text-[12px]">
                    {r.month && r.year ? `${MONTHS[r.month - 1]} ${r.year}` : "—"}
                  </td>
                  <td className="text-right">
                    <span className="text-[13px] font-bold" style={{ color: "#18181B" }}>{formatCurrency(r.amount)}</span>
                    {r.type === "SALARY" && Number((r.requestData).advanceRecoveryAmount ?? 0) > 0 && (
                      <p className="text-[11px]" style={{ color: "#059669" }}>
                        −{formatCurrency(Number((r.requestData).advanceRecoveryAmount))} adv.
                      </p>
                    )}
                  </td>
                  <td className="text-[12px]" style={{ maxWidth: 160 }}>
                    <div className="truncate" style={{ color: "#52525B" }}>{r.remarks ?? "—"}</div>
                    {r.status === "REJECTED" && r.reviewNote && (
                      <div className="text-[11px] mt-0.5 font-medium" style={{ color: "#DC2626" }}>
                        Reason: {r.reviewNote}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: "#2563EB" }}>
                          {r.requestedBy.name.charAt(0)}
                        </div>
                        <span className="text-[12px]" style={{ color: "#52525B" }}>{r.requestedBy.name}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${REQUEST_STATUS[r.status]?.chip ?? "bg-slate-100 text-slate-600"}`}>
                        {REQUEST_STATUS[r.status]?.label ?? r.status}
                      </span>
                      {r.reviewedBy && r.status !== "PENDING" && (
                        <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>by {r.reviewedBy.name}</p>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View details */}
                        <button onClick={() => setViewModal(r)} title="View details"
                          style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #E4E4E7", background:"#fff", color:"#52525B", cursor:"pointer" }}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {r.status === "PENDING" && (
                          <>
                            <button onClick={() => handleApprove(r.id)} disabled={isPending}
                              title="Approve"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #86EFAC", background:"#F0FDF4", color:"#16A34A", cursor:"pointer" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(r); setRejectNote(""); }} disabled={isPending}
                              title="Reject"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #FCA5A5", background:"#FEF2F2", color:"#DC2626", cursor:"pointer" }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View detail modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Salary Request Details" size="md">
        {viewModal && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "#18181B" }}>{viewModal.employee.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>
                  {ROLE_LABELS[viewModal.employee.role] ?? viewModal.employee.role} · {formatDateTime(viewModal.createdAt)}
                </p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${REQUEST_STATUS[viewModal.status]?.chip}`}>
                {REQUEST_STATUS[viewModal.status]?.label ?? viewModal.status}
              </span>
            </div>

            {/* Key fields */}
            <div className="rounded-xl divide-y" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
              {[
                ["Type",        <span key="type" className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[viewModal.type] ?? ""}`}>{viewModal.type.replace(/_/g, " ")}</span>],
                ["Amount",      <span key="amt" className="font-bold text-[14px]" style={{ color: "#18181B" }}>{formatCurrency(viewModal.amount)}</span>],
                ["Period",      viewModal.month && viewModal.year ? `${MONTHS[viewModal.month - 1]} ${viewModal.year}` : "—"],
                ["Requested by", viewModal.requestedBy.name],
                ["Remarks",     viewModal.remarks ?? "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>{label}</span>
                  <span style={{ color: "#18181B" }}>{value}</span>
                </div>
              ))}
              {viewModal.type === "SALARY" && Number((viewModal.requestData).advanceRecoveryAmount ?? 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>Advance Recovery</span>
                  <span className="font-semibold" style={{ color: "#059669" }}>−{formatCurrency(Number((viewModal.requestData).advanceRecoveryAmount))}</span>
                </div>
              )}
              {viewModal.type === "ADVANCE" && !!((viewModal.requestData).advanceDate) && (
                <div className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>Advance Date</span>
                  <span style={{ color: "#18181B" }}>{formatDate(String((viewModal.requestData).advanceDate))}</span>
                </div>
              )}
              {!!((viewModal.requestData).reason) && (
                <div className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>Reason</span>
                  <span style={{ color: "#18181B" }}>{String((viewModal.requestData).reason)}</span>
                </div>
              )}
            </div>

            {/* Rejection note */}
            {viewModal.status === "REJECTED" && viewModal.reviewNote && (
              <div className="px-3 py-2.5 rounded-md text-[13px]"
                style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626" }}>
                <strong>Rejection reason:</strong> {viewModal.reviewNote}
              </div>
            )}

            {/* Actions for pending (in modal) */}
            {isAdmin && viewModal.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { handleApprove(viewModal.id); setViewModal(null); }}
                  className="btn flex-1 justify-center"
                  style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                </button>
                <button
                  onClick={() => { setViewModal(null); setRejectModal(viewModal); setRejectNote(""); }}
                  className="btn btn-danger flex-1 justify-center">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectNote(""); }} title="Reject Salary Request" size="sm">
        {rejectModal && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 text-[13px] space-y-1.5" style={{ background: "#F4F4F5" }}>
              <div className="flex justify-between"><span style={{ color: "#71717A" }}>Employee</span><span className="font-medium">{rejectModal.employee.name}</span></div>
              <div className="flex justify-between"><span style={{ color: "#71717A" }}>Type</span><span className="font-medium">{rejectModal.type.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span style={{ color: "#71717A" }}>Amount</span><span className="font-bold">{formatCurrency(rejectModal.amount)}</span></div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#18181B" }}>
                Reason for Rejection *
              </label>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this request is being rejected…"
                rows={3} className="input resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }} className="btn btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleReject} disabled={isPending || !rejectNote.trim()} className="btn btn-danger flex-1 justify-center">
                {isPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Section 3: Leave Requests ────────────────────────────────────────────────

function LeaveRequestsSection({
  requests, role, onUpdate,
}: {
  requests: LeaveRequest[];
  role: string;
  onUpdate: (r: LeaveRequest) => void;
}) {
  const [filter, setFilter]           = useState<typeof LEAVE_FILTERS[number]>("PENDING");
  const [viewModal, setViewModal]     = useState<LeaveRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [isPending, startTransition]  = useTransition();

  const isAdmin   = role === "ADMIN";
  const filtered  = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  const pendingCount   = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount  = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount  = requests.filter((r) => r.status === "REJECTED").length;
  const totalDaysPending = requests
    .filter((r) => r.status === "PENDING")
    .reduce((s, r) => s + r.totalDays, 0);

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await reviewLeave(id, "APPROVED");
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.leave) {
        onUpdate(result.leave as unknown as LeaveRequest);
        if (viewModal?.id === id) setViewModal(null);
      }
    });
  }

  function handleReject() {
    if (!rejectModal || !rejectNote.trim()) return;
    startTransition(async () => {
      const result = await reviewLeave(rejectModal.id, "REJECTED", rejectNote.trim());
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.leave) {
        onUpdate(result.leave as unknown as LeaveRequest);
        setRejectModal(null);
        setRejectNote("");
      }
    });
  }

  function leaveLabel(type: string)  { return LEAVE_TYPE_META[type]?.label  ?? type; }
  function leaveColor(type: string)  { return LEAVE_TYPE_META[type]?.color  ?? "bg-slate-100 text-slate-700"; }

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Pending",       val: pendingCount,              color: "#D97706", bg: "#FFFBEB" },
          { label: "Approved",      val: approvedCount,             color: "#16A34A", bg: "#F0FDF4" },
          { label: "Rejected",      val: rejectedCount,             color: "#DC2626", bg: "#FEF2F2" },
          { label: "Pending Days",  val: `${totalDaysPending} d`,   color: "#2563EB", bg: "#EFF6FF" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="rounded-xl px-4 py-3" style={{ background: bg, border: `1px solid ${color}22` }}>
            <p className="text-[11px] font-medium mb-0.5" style={{ color: "#71717A" }}>{label}</p>
            <p className="text-[20px] font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      {isAdmin && pendingCount > 0 && filter === "PENDING" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: "#2563EB" }} />
          <p className="text-[13px]" style={{ color: "#1D4ED8" }}>
            <strong>{pendingCount} leave request{pendingCount > 1 ? "s" : ""}</strong> awaiting your review.
            Employees are notified once you approve or reject.
          </p>
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#D97706" }} />
          <p className="text-[13px]" style={{ color: "#92400E" }}>
            As manager you can approve or reject employee leave requests on behalf of the agency.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {LEAVE_FILTERS.map((f) => {
          const count = f === "ALL" ? requests.length : requests.filter((r) => r.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className="btn text-[12px]"
              style={filter === f
                ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                : { background: "#fff", color: "#52525B", border: "1px solid #E4E4E7" }}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[12px]" style={{ color: "#A1A1AA" }}>{filtered.length} requests</span>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden"
        style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                    <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
                      {filter === "PENDING" ? "No pending leave requests" : "No leave requests found"}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((r) => {
                const isPendingRow = r.status === "PENDING";
                const statusChip =
                  r.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  r.status === "REJECTED"  ? "bg-red-100 text-red-700"   :
                  "bg-amber-100 text-amber-700";
                const statusIcon =
                  r.status === "APPROVED" ? "✓" :
                  r.status === "REJECTED"  ? "✗" : "⏳";
                return (
                  <tr key={r.id} style={isPendingRow ? { background: "#FFFBEB" } : {}}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                          style={{ background: "#7C3AED" }}>
                          {r.employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{r.employee.name}</p>
                          <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
                            {ROLE_LABELS[r.employee.role] ?? r.employee.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveColor(r.leaveType)}`}>
                        {leaveLabel(r.leaveType)}
                      </span>
                    </td>
                    <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(r.startDate)}</td>
                    <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(r.endDate)}</td>
                    <td>
                      <span className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                        {r.totalDays}
                      </span>
                    </td>
                    <td style={{ maxWidth: 160 }}>
                      <div className="truncate text-[12px]" style={{ color: "#52525B" }}>{r.reason}</div>
                      {r.status === "REJECTED" && r.reviewNote && (
                        <div className="text-[11px] mt-0.5 font-medium" style={{ color: "#DC2626" }}>
                          Reason: {r.reviewNote}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${statusChip}`}>
                        {statusIcon} {r.status}
                      </span>
                    </td>
                    <td className="text-[12px]" style={{ color: "#52525B" }}>
                      {r.reviewedBy
                        ? <span>{r.reviewedBy.name}</span>
                        : <span style={{ color: "#A1A1AA" }}>—</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setViewModal(r)} title="View details"
                          style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                            width:30, height:30, borderRadius:6, border:"1px solid #E4E4E7",
                            background:"#fff", color:"#52525B", cursor:"pointer" }}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isPendingRow && (
                          <>
                            <button onClick={() => handleApprove(r.id)} disabled={isPending} title="Approve"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                width:30, height:30, borderRadius:6, border:"1px solid #86EFAC",
                                background:"#F0FDF4", color:"#16A34A", cursor:"pointer" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(r); setRejectNote(""); }}
                              disabled={isPending} title="Reject"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                width:30, height:30, borderRadius:6, border:"1px solid #FCA5A5",
                                background:"#FEF2F2", color:"#DC2626", cursor:"pointer" }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* View detail modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Leave Request Details" size="md">
        {viewModal && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                  style={{ background: "#7C3AED" }}>
                  {viewModal.employee.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>
                    {viewModal.employee.name}
                  </p>
                  <p className="text-[12px]" style={{ color: "#71717A" }}>
                    {ROLE_LABELS[viewModal.employee.role] ?? viewModal.employee.role}
                  </p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                viewModal.status === "APPROVED" ? "bg-green-100 text-green-700" :
                viewModal.status === "REJECTED"  ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {viewModal.status === "APPROVED" ? "✓ " : viewModal.status === "REJECTED" ? "✗ " : "⏳ "}
                {viewModal.status}
              </span>
            </div>

            {/* Key details */}
            <div className="rounded-xl divide-y" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
              {[
                ["Leave Type",  <span key="lt" className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveColor(viewModal.leaveType)}`}>{leaveLabel(viewModal.leaveType)}</span>],
                ["Start Date",  formatDate(viewModal.startDate)],
                ["End Date",    formatDate(viewModal.endDate)],
                ["Duration",    `${viewModal.totalDays} day${viewModal.totalDays !== 1 ? "s" : ""}`],
                ["Applied On",  formatDate(viewModal.createdAt)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span style={{ color: "#71717A" }}>{label}</span>
                  <span className="font-medium" style={{ color: "#18181B" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Reason */}
            <div>
              <p className="text-[12px] font-semibold mb-1.5" style={{ color: "#374151" }}>Reason</p>
              <div className="px-4 py-3 rounded-xl text-[13px]"
                style={{ background: "#F4F4F5", border: "1px solid #E4E4E7", color: "#374151", lineHeight: 1.6 }}>
                {viewModal.reason}
              </div>
            </div>

            {/* Review info */}
            {viewModal.reviewedBy && (
              <div className="px-4 py-3 rounded-xl text-[13px] space-y-1"
                style={{
                  background: viewModal.status === "APPROVED" ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${viewModal.status === "APPROVED" ? "#86EFAC" : "#FCA5A5"}`,
                }}>
                <p className="font-semibold"
                  style={{ color: viewModal.status === "APPROVED" ? "#15803D" : "#B91C1C" }}>
                  {viewModal.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"} by {viewModal.reviewedBy.name}
                </p>
                {viewModal.reviewNote && (
                  <p style={{ color: "#374151" }}>{viewModal.reviewNote}</p>
                )}
              </div>
            )}

            {/* Approve / Reject from modal */}
            {viewModal.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleApprove(viewModal.id)}
                  disabled={isPending}
                  className="btn flex-1 justify-center"
                  style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                </button>
                <button
                  onClick={() => { setRejectModal(viewModal); setViewModal(null); setRejectNote(""); }}
                  className="btn btn-danger flex-1 justify-center">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectNote(""); }}
        title="Reject Leave Request" size="sm">
        {rejectModal && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 text-[13px] space-y-1.5" style={{ background: "#F4F4F5" }}>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Employee</span>
                <span className="font-medium">{rejectModal.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Leave Type</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveColor(rejectModal.leaveType)}`}>
                  {leaveLabel(rejectModal.leaveType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Duration</span>
                <span className="font-medium">
                  {formatDate(rejectModal.startDate)} – {formatDate(rejectModal.endDate)}{" "}
                  ({rejectModal.totalDays} day{rejectModal.totalDays !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="pt-1 text-[12px]" style={{ color: "#52525B" }}>
                <span className="font-medium" style={{ color: "#374151" }}>Reason: </span>
                {rejectModal.reason}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#18181B" }}>
                Reason for Rejection *
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this leave request is being rejected…"
                rows={3} className="input resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }}
                className="btn btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleReject}
                disabled={isPending || !rejectNote.trim()}
                className="btn btn-danger flex-1 justify-center">
                {isPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
