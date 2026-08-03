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
import { approveSalaryRequest, rejectSalaryRequest, managerApproveSalaryRequest, managerRejectSalaryRequest } from "@/app/actions/salary-requests";
import { reviewLeave } from "@/app/actions/leave";
import { adminReviewEmployeeExpense, managerReviewEmployeeExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeExpenseItem {
  id: string;
  expenseDate: Date | string;
  categoryLabel: string;
  amount: number;
  receiptUrl?: string | null;
  receiptPublicId?: string | null;
  note?: string | null;
  status: "PENDING" | "MANAGER_APPROVED" | "APPROVED" | "REJECTED";
  managerNote?: string | null;
  adminNote?: string | null;
  createdAt: Date | string;
  submittedBy?: { name: string; email: string; role: string };
  manager?: { name: string } | null;
  admin?: { name: string } | null;
}

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
  managerReviewNote: string | null;
  managerReviewedAt: Date | string | null;
  requestData: Record<string, unknown>;
  employeeId: string;
  employee: { name: string; role: string };
  requestedBy: { name: string; role: string };
  reviewedBy: { name: string } | null;
  managerReviewedBy: { name: string } | null;
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
const SALARY_FILTERS  = ["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "ALL"] as const;
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
  PENDING:  { label: "⏳ Pending Manager",  chip: "bg-amber-100 text-amber-700" },
  MANAGER_APPROVED: { label: "⏳ Manager Approved", chip: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "✓ Approved", chip: "bg-green-100 text-green-700" },
  REJECTED: { label: "✗ Rejected", chip: "bg-red-100 text-red-700" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalsClient({
  initialSummaries,
  initialSalaryRequests,
  initialLeaveRequests,
  initialEmployeeExpenses = [],
  role,
  userId,
}: {
  initialSummaries: Summary[];
  initialSalaryRequests: SalaryRequest[];
  initialLeaveRequests: LeaveRequest[];
  initialEmployeeExpenses?: EmployeeExpenseItem[];
  role: string;
  userId: string;
}) {
  const [activeTab, setActiveTab] = useState<"daily" | "salary" | "leave" | "expense">("daily");

  const [summaries, setSummaries]           = useState(initialSummaries);
  const [salaryRequests, setSalaryRequests] = useState(initialSalaryRequests);
  const [leaveRequests, setLeaveRequests]   = useState(initialLeaveRequests);
  const [employeeExpenses, setEmployeeExpenses] = useState(initialEmployeeExpenses);

  const pendingSummaries = summaries.filter((s) => s.status === "PENDING").length;
  const pendingSalary    = salaryRequests.filter((r) => r.status === "PENDING").length;
  const pendingLeave     = leaveRequests.filter((l) => l.status === "PENDING").length;
  const pendingExpense   = employeeExpenses.filter((e) =>
    role === "ADMIN" ? e.status === "MANAGER_APPROVED" || e.status === "PENDING" : e.status === "PENDING"
  ).length;

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
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
        <TabBtn
          label="Expense Requests"
          badge={pendingExpense}
          active={activeTab === "expense"}
          onClick={() => setActiveTab("expense")}
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

      {activeTab === "expense" && (
        <EmployeeExpensesSection
          expenses={employeeExpenses}
          role={role}
          onUpdate={(updated) =>
            setEmployeeExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
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
  const isManager = role === "MANAGER";

  const filtered = requests.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") {
      if (isAdmin) {
        return r.status === "MANAGER_APPROVED" || (r.status === "PENDING" && ["MANAGER", "ADMIN"].includes(r.requestedBy.role));
      } else {
        return r.status === "PENDING" && !["MANAGER", "ADMIN"].includes(r.requestedBy.role);
      }
    }
    return r.status === filter;
  });

  const pendingTotal = requests
    .filter((r) => r.status === "PENDING" || r.status === "MANAGER_APPROVED")
    .reduce((s, r) => s + r.amount, 0);

  function handleApprove(id: string, reqStatus: string) {
    const actionName = isAdmin ? "final approval" : "manager approval";
    if (!confirm(`Confirm ${actionName} for this request?`)) return;
    startTransition(async () => {
      const result = isAdmin 
        ? await approveSalaryRequest(id)
        : await managerApproveSalaryRequest(id);
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.request) onUpdate(result.request as unknown as SalaryRequest);
    });
  }

  function handleReject() {
    if (!rejectModal) return;
    if (!rejectNote.trim()) { alert("Please enter a reason for rejection."); return; }
    startTransition(async () => {
      const result = isAdmin
        ? await rejectSalaryRequest(rejectModal.id, rejectNote.trim())
        : await managerRejectSalaryRequest(rejectModal.id, rejectNote.trim());
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
          { label: "Pending",  val: requests.filter((r) => r.status === "PENDING" || r.status === "MANAGER_APPROVED").length,  color: "#D97706", bg: "#FFFBEB" },
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
                <th>Requested By</th>
                <th>Status</th>
                {(isAdmin || isManager) && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin || isManager ? 9 : 8} className="py-14 text-center">
                  <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                  <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
                    {filter === "PENDING"
                      ? "No pending requests — all caught up!"
                      : "No requests found"}
                  </p>
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} style={r.status === "PENDING" || r.status === "MANAGER_APPROVED" ? { background: "#FFFBEB" } : {}}>
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
                        Admin Reason: {r.reviewNote}
                      </div>
                    )}
                    {r.status === "REJECTED" && r.managerReviewNote && (
                      <div className="text-[11px] mt-0.5 font-medium" style={{ color: "#D97706" }}>
                        Manager Reason: {r.managerReviewNote}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: "#2563EB" }}>
                        {r.requestedBy.name.charAt(0)}
                      </div>
                      <span className="text-[12px]" style={{ color: "#52525B" }}>{r.requestedBy.name}</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${REQUEST_STATUS[r.status]?.chip ?? "bg-slate-100 text-slate-600"}`}>
                        {REQUEST_STATUS[r.status]?.label ?? r.status}
                      </span>
                      {r.reviewedBy && r.status === "APPROVED" && (
                        <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>by {r.reviewedBy.name}</p>
                      )}
                      {r.managerReviewedBy && r.status === "MANAGER_APPROVED" && (
                        <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>by {r.managerReviewedBy.name}</p>
                      )}
                    </div>
                  </td>
                  {(isAdmin || isManager) && (
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View details */}
                        <button onClick={() => setViewModal(r)} title="View details"
                          style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #E4E4E7", background:"#fff", color:"#52525B", cursor:"pointer" }}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Manager actions */}
                        {isManager && r.status === "PENDING" && !["MANAGER", "ADMIN"].includes(r.requestedBy.role) && (
                          <>
                            <button onClick={() => handleApprove(r.id, r.status)} disabled={isPending}
                              title="Approve (Manager)"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #86EFAC", background:"#F0FDF4", color:"#16A34A", cursor:"pointer" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(r); setRejectNote(""); }} disabled={isPending}
                              title="Reject (Manager)"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #FCA5A5", background:"#FEF2F2", color:"#DC2626", cursor:"pointer" }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Admin actions */}
                        {isAdmin && (r.status === "MANAGER_APPROVED" || (r.status === "PENDING" && ["MANAGER", "ADMIN"].includes(r.requestedBy.role))) && (
                          <>
                            <button onClick={() => handleApprove(r.id, r.status)} disabled={isPending}
                              title="Approve (Admin)"
                              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:6, border:"1px solid #86EFAC", background:"#F0FDF4", color:"#16A34A", cursor:"pointer" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(r); setRejectNote(""); }} disabled={isPending}
                              title="Reject (Admin)"
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

            {/* Manager review details */}
            {viewModal.managerReviewedBy && (
              <div className="px-3 py-2 rounded-md text-[13px] border"
                style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#334155" }}>
                <p><strong>Manager Reviewer:</strong> {viewModal.managerReviewedBy.name}</p>
                {viewModal.managerReviewNote && (
                  <p className="mt-1"><strong>Manager Note:</strong> {viewModal.managerReviewNote}</p>
                )}
              </div>
            )}

            {/* Admin review details */}
            {viewModal.reviewedBy && (
              <div className="px-3 py-2 rounded-md text-[13px] border"
                style={{ background: "#F0FDF4", borderColor: "#DCFCE7", color: "#166534" }}>
                <p><strong>Admin Reviewer:</strong> {viewModal.reviewedBy.name}</p>
                {viewModal.reviewNote && (
                  <p className="mt-1"><strong>Admin Note:</strong> {viewModal.reviewNote}</p>
                )}
              </div>
            )}

            {/* Actions for pending/manager_approved (in modal) */}
            {((isManager && viewModal.status === "PENDING" && !["MANAGER", "ADMIN"].includes(viewModal.requestedBy.role)) ||
              (isAdmin && (viewModal.status === "MANAGER_APPROVED" || (viewModal.status === "PENDING" && ["MANAGER", "ADMIN"].includes(viewModal.requestedBy.role))))) && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { handleApprove(viewModal.id, viewModal.status); setViewModal(null); }}
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

// ─── Employee Expenses Approval Section Component ─────────────────────────────

function EmployeeExpensesSection({
  expenses,
  role,
  onUpdate,
}: {
  expenses: EmployeeExpenseItem[];
  role: string;
  onUpdate: (updated: EmployeeExpenseItem) => void;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    id: string;
    action: "APPROVE" | "REJECT";
    category: string;
    amount: number;
    employeeName: string;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleReview = async () => {
    if (!reviewModal) return;
    setIsSubmitting(true);

    let res;
    if (role === "ADMIN") {
      res = await adminReviewEmployeeExpense(reviewModal.id, reviewModal.action, reviewNote);
    } else {
      res = await managerReviewEmployeeExpense(reviewModal.id, reviewModal.action, reviewNote);
    }

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.expense) {
      toast.success(
        reviewModal.action === "APPROVE"
          ? "Expense approved successfully!"
          : "Expense claim rejected."
      );
      onUpdate(res.expense as any);
      setReviewModal(null);
      setReviewNote("");
    }
  };

  const filtered = expenses.filter((e) => {
    if (filter === "ALL") return true;
    return e.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Employee Expense Claims</h3>
          <p className="text-xs text-slate-500">
            {role === "ADMIN"
              ? "Final review & approval of manager-cleared expense claims"
              : "Initial review & approval of staff expense claims"}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {["ALL", "PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                filter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "ALL"
                ? "All"
                : st === "PENDING"
                ? "Pending Manager"
                : st === "MANAGER_APPROVED"
                ? "Pending Admin"
                : st === "APPROVED"
                ? "Approved"
                : "Rejected"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
          No expense records found under selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {exp.submittedBy?.name || "Employee"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                      {exp.submittedBy?.role || "STAFF"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        exp.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : exp.status === "MANAGER_APPROVED"
                          ? "bg-blue-100 text-blue-800"
                          : exp.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {exp.status === "PENDING"
                        ? "Pending Manager"
                        : exp.status === "MANAGER_APPROVED"
                        ? "Manager Approved (Pending Admin)"
                        : exp.status === "APPROVED"
                        ? "Final Approved"
                        : "Rejected"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">{exp.categoryLabel}</span>
                    <span>•</span>
                    <span className="font-bold text-blue-600 text-sm">₹{exp.amount.toLocaleString("en-IN")}</span>
                    <span>•</span>
                    <span>{new Date(exp.expenseDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {exp.receiptUrl && (
                    <button
                      onClick={() => setSelectedReceipt(exp.receiptUrl!)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" /> Receipt
                    </button>
                  )}

                  {/* Actions depending on role & status */}
                  {((role === "ADMIN" && (exp.status === "MANAGER_APPROVED" || exp.status === "PENDING")) ||
                    (role === "MANAGER" && exp.status === "PENDING")) && (
                    <>
                      <button
                        onClick={() =>
                          setReviewModal({
                            id: exp.id,
                            action: "APPROVE",
                            category: exp.categoryLabel,
                            amount: exp.amount,
                            employeeName: exp.submittedBy?.name || "Employee",
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setReviewModal({
                            id: exp.id,
                            action: "REJECT",
                            category: exp.categoryLabel,
                            amount: exp.amount,
                            employeeName: exp.submittedBy?.name || "Employee",
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {exp.note && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-800">Note: </span>
                  {exp.note}
                </div>
              )}

              {exp.managerNote && (
                <div className="text-xs text-blue-700 bg-blue-50/60 p-2 rounded-md">
                  <span className="font-semibold">Manager ({exp.manager?.name || "Manager"}): </span>
                  {exp.managerNote}
                </div>
              )}
              {exp.adminNote && (
                <div className="text-xs text-emerald-700 bg-emerald-50/60 p-2 rounded-md">
                  <span className="font-semibold">Admin ({exp.admin?.name || "Admin"}): </span>
                  {exp.adminNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title={reviewModal.action === "APPROVE" ? "Approve Expense" : "Reject Expense"}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Confirm action for <span className="font-semibold">{reviewModal.employeeName}</span>&apos;s claim of{" "}
              <span className="font-semibold text-blue-600">₹{reviewModal.amount.toLocaleString("en-IN")}</span> ({reviewModal.category}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {role === "ADMIN" ? "Admin Remark" : "Manager Remark"} (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter review notes..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleReview}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold ${
                  reviewModal.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting ? "Processing..." : `Confirm ${reviewModal.action}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Receipt Verification Photo">
          <div className="space-y-3">
            <div className="flex justify-center bg-slate-100 p-3 rounded-xl max-h-[65vh] overflow-auto">
              {/* eslint-disable-next-next/image-element */}
              <img src={selectedReceipt} alt="Receipt photo" className="max-h-[60vh] object-contain rounded-lg shadow-sm" />
            </div>
            <div className="flex justify-end">
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Open Full Image
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

