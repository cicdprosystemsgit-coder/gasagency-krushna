"use client";

import { useState, useTransition, useMemo } from "react";
import { reviewLeave, bulkReviewLeaves } from "@/app/actions/leave";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Eye, CalendarDays, Clock,
  AlertTriangle, Users, Search, Filter,
  CalendarRange, ChevronDown, UserCheck,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
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
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  employee: { id: string; name: string; role: string };
  reviewedBy: { name: string } | null;
}

export interface EmployeeEntry {
  id: string;
  name: string;
  role: string;
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

const STATUS_TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

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

// ─── Main component ───────────────────────────────────────────────────────────

export function LeaveAdminClient({
  initialLeaves,
  employees,
  role,
}: {
  initialLeaves: LeaveRecord[];
  employees: EmployeeEntry[];
  role: string;
}) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);
  const [activeTab, setActiveTab] = useState<"requests" | "summary" | "today">("requests");
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_TABS[number]>("PENDING");
  const [typeFilter,   setTypeFilter]   = useState("ALL");
  const [empFilter,    setEmpFilter]    = useState("ALL");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  // Modals
  const [viewLeave,    setViewLeave]    = useState<LeaveRecord | null>(null);
  const [rejectLeave,  setRejectLeave]  = useState<LeaveRecord | null>(null);
  const [rejectNote,   setRejectNote]   = useState("");

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"" | "APPROVE" | "REJECT">("");
  const [bulkNote,   setBulkNote]   = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().split("T")[0];

  const totalPending  = leaves.filter((l) => l.status === "PENDING").length;
  const approvedMonth = leaves.filter((l) => l.status === "APPROVED" && new Date(l.createdAt) >= monthStart).length;
  const rejectedMonth = leaves.filter((l) => l.status === "REJECTED" && new Date(l.createdAt) >= monthStart).length;
  const onLeaveToday  = leaves.filter((l) => {
    if (l.status !== "APPROVED") return false;
    const s = new Date(l.startDate);
    const e = new Date(l.endDate);
    const t = new Date(todayStr);
    return s <= t && t <= e;
  }).length;

  // Filtered list
  const filtered = useMemo(() => {
    return leaves.filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && l.leaveType !== typeFilter) return false;
      if (empFilter !== "ALL" && l.employee.id !== empFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!l.employee.name.toLowerCase().includes(q) && !l.reason.toLowerCase().includes(q)) return false;
      }
      if (dateFrom && new Date(l.startDate) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(l.endDate)   > new Date(dateTo))   return false;
      return true;
    });
  }, [leaves, statusFilter, typeFilter, empFilter, searchQuery, dateFrom, dateTo]);

  // Employee summary
  const employeeSummary = useMemo(() => {
    const map: Record<string, { name: string; role: string; pending: number; approved: number; rejected: number; totalDays: number }> = {};
    for (const l of leaves) {
      if (!map[l.employee.id]) {
        map[l.employee.id] = { name: l.employee.name, role: l.employee.role, pending: 0, approved: 0, rejected: 0, totalDays: 0 };
      }
      const e = map[l.employee.id];
      if (l.status === "PENDING")  e.pending++;
      if (l.status === "APPROVED") { e.approved++; e.totalDays += l.totalDays; }
      if (l.status === "REJECTED") e.rejected++;
    }
    return Object.entries(map).map(([id, v]) => ({ id, ...v }));
  }, [leaves]);

  // Today on leave
  const onLeaveTodayList = useMemo(() => {
    const t = new Date(todayStr);
    return leaves.filter((l) => {
      if (l.status !== "APPROVED") return false;
      return new Date(l.startDate) <= t && t <= new Date(l.endDate);
    });
  }, [leaves, todayStr]);

  function doApprove(id: string) {
    startTransition(async () => {
      const result = await reviewLeave(id, "APPROVED");
      if ("error" in result) return;
      if (result.leave) {
        setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, ...result.leave } as LeaveRecord : l));
      }
    });
  }

  function doReject() {
    if (!rejectLeave) return;
    if (!rejectNote.trim()) return;
    startTransition(async () => {
      const result = await reviewLeave(rejectLeave.id, "REJECTED", rejectNote.trim());
      if ("error" in result) return;
      if (result.leave) {
        setLeaves((prev) => prev.map((l) => l.id === rejectLeave.id ? { ...l, ...result.leave } as LeaveRecord : l));
        setRejectLeave(null);
        setRejectNote("");
      }
    });
  }

  function doBulkAction() {
    if (selected.size === 0) return;
    const action = bulkAction === "APPROVE" ? "APPROVED" : "REJECTED";
    startTransition(async () => {
      const result = await bulkReviewLeaves(Array.from(selected), action, bulkNote.trim() || undefined);
      if ("error" in result) return;
      setLeaves((prev) => prev.map((l) =>
        selected.has(l.id) && l.status === "PENDING"
          ? { ...l, status: action, reviewNote: bulkNote.trim() || null }
          : l
      ));
      setSelected(new Set());
      setBulkAction("");
      setBulkNote("");
      setShowBulkModal(false);
    });
  }

  const pendingFiltered = filtered.filter((l) => l.status === "PENDING");

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            Leave Management
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            Review, approve and manage all employee leave requests
          </p>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pending Requests", val: totalPending,   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A",
            icon: <Clock className="w-4 h-4" /> },
          { label: "Approved This Month", val: approvedMonth, color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC",
            icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: "Rejected This Month", val: rejectedMonth, color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5",
            icon: <XCircle className="w-4 h-4" /> },
          { label: "On Leave Today",    val: onLeaveToday,  color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD",
            icon: <Users className="w-4 h-4" /> },
        ].map(({ label, val, color, bg, border, icon }) => (
          <div key={label} className="rounded-xl px-4 py-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color }}>{icon}</span>
              <p className="text-[11px] font-medium" style={{ color: "#71717A" }}>{label}</p>
            </div>
            <p className="text-[24px] font-bold leading-none" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "requests", label: "Leave Requests",    badge: totalPending },
          { key: "summary",  label: "Employee Summary",  badge: 0 },
          { key: "today",    label: "On Leave Today",    badge: onLeaveToday },
        ].map(({ key, label, badge }) => (
          <button key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={activeTab === key
              ? { background: "#fff", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { background: "transparent", color: "#71717A", cursor: "pointer" }}>
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Leave Requests ════════════════════════════════════ */}
      {activeTab === "requests" && (
        <div>
          {/* Pending action banner */}
          {totalPending > 0 && statusFilter === "PENDING" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#D97706" }} />
              <p className="text-[13px]" style={{ color: "#92400E" }}>
                <strong>{totalPending} pending leave request{totalPending > 1 ? "s" : ""}</strong> await your review.
                Employees are notified once you approve or reject.
              </p>
            </div>
          )}

          {/* Filter bar */}
          <div className="rounded-xl p-4 mb-4 space-y-3"
            style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pills */}
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_TABS.map((s) => {
                  const count = s === "ALL" ? leaves.length : leaves.filter((l) => l.status === s).length;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                      style={statusFilter === s
                        ? { background: "#2563EB", color: "#fff" }
                        : { background: "#F4F4F5", color: "#52525B", cursor: "pointer" }}>
                      {s === "PENDING" && <Clock className="w-3 h-3" />}
                      {s === "APPROVED" && <CheckCircle2 className="w-3 h-3" />}
                      {s === "REJECTED" && <XCircle className="w-3 h-3" />}
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                      <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Search */}
              <div className="relative col-span-2 md:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                <input
                  type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee or reason…"
                  className="input pl-8 text-[12px]" />
              </div>

              {/* Leave type */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  className="input pl-8 text-[12px] appearance-none">
                  <option value="ALL">All Types</option>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#A1A1AA" }} />
              </div>

              {/* Employee */}
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}
                  className="input pl-8 text-[12px] appearance-none">
                  <option value="ALL">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#A1A1AA" }} />
              </div>

              {/* Date from/to */}
              <div className="flex items-center">
                <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
              </div>
            </div>

            {/* Clear filters */}
            {(searchQuery || typeFilter !== "ALL" || empFilter !== "ALL" || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearchQuery(""); setTypeFilter("ALL"); setEmpFilter("ALL"); setDateFrom(""); setDateTo(""); }}
                className="text-[12px] font-medium"
                style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>
                Clear all filters
              </button>
            )}
          </div>

          {/* Bulk action bar (appears when items selected) */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <span className="text-[13px] font-semibold" style={{ color: "#1D4ED8" }}>
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => { setBulkAction("APPROVE"); setShowBulkModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style={{ background: "#16A34A", color: "#fff", border: "none", cursor: "pointer" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
                </button>
                <button
                  onClick={() => { setBulkAction("REJECT"); setShowBulkModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style={{ background: "#DC2626", color: "#fff", border: "none", cursor: "pointer" }}>
                  <XCircle className="w-3.5 h-3.5" /> Reject All
                </button>
                <button onClick={() => setSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg text-[12px]"
                  style={{ background: "#F4F4F5", color: "#52525B", border: "none", cursor: "pointer" }}>
                  Deselect
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid #E4E4E7" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                Leave Requests
              </p>
              <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{filtered.length} requests</span>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    {statusFilter === "PENDING" && (
                      <th style={{ width: 36 }}>
                        <input type="checkbox"
                          checked={pendingFiltered.length > 0 && pendingFiltered.every((l) => selected.has(l.id))}
                          onChange={(e) => {
                            if (e.target.checked) setSelected(new Set(pendingFiltered.map((l) => l.id)));
                            else setSelected(new Set());
                          }} />
                      </th>
                    )}
                    <th>Employee</th>
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={statusFilter === "PENDING" ? 10 : 9} className="py-14 text-center">
                        <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                        <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No leave requests found</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>
                          Try adjusting your filters
                        </p>
                      </td>
                    </tr>
                  ) : filtered.map((leave) => {
                    const st = STATUS_STYLES[leave.status] ?? STATUS_STYLES.PENDING;
                    const isPendingRow = leave.status === "PENDING";
                    return (
                      <tr key={leave.id} style={isPendingRow && selected.has(leave.id) ? { background: "#EFF6FF" } : {}}>
                        {statusFilter === "PENDING" && (
                          <td>
                            {isPendingRow && (
                              <input type="checkbox"
                                checked={selected.has(leave.id)}
                                onChange={(e) => {
                                  const next = new Set(selected);
                                  if (e.target.checked) next.add(leave.id);
                                  else next.delete(leave.id);
                                  setSelected(next);
                                }} />
                            )}
                          </td>
                        )}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                              style={{ background: "#7C3AED" }}>
                              {leave.employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{leave.employee.name}</p>
                              <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
                                {ROLE_LABELS[leave.employee.role] ?? leave.employee.role}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveTypeColor(leave.leaveType)}`}>
                            {leaveTypeLabel(leave.leaveType)}
                          </span>
                        </td>
                        <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(leave.startDate)}</td>
                        <td className="text-[13px]" style={{ color: "#374151" }}>{formatDate(leave.endDate)}</td>
                        <td>
                          <span className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{leave.totalDays}</span>
                        </td>
                        <td style={{ maxWidth: 180 }}>
                          <p className="text-[12px] truncate" style={{ color: "#52525B" }}>{leave.reason}</p>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${st.chip}`}>
                            {st.icon} {leave.status}
                          </span>
                        </td>
                        <td className="text-[12px]" style={{ color: "#52525B" }}>
                          {leave.reviewedBy
                            ? <span>{leave.reviewedBy.name}</span>
                            : <span style={{ color: "#A1A1AA" }}>—</span>}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewLeave(leave)}
                              title="View"
                              className="btn-action"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {isPendingRow && (
                              <>
                                <button
                                  onClick={() => doApprove(leave.id)}
                                  disabled={isPending}
                                  title="Approve"
                                  className="btn-action btn-action-success"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setRejectLeave(leave); setRejectNote(""); }}
                                  disabled={isPending}
                                  title="Reject"
                                  className="btn-action btn-action-danger"
                                >
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
        </div>
      )}

      {/* ═══ Tab: Employee Summary ════════════════════════════════== */}
      {activeTab === "summary" && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid #E4E4E7" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Employee Leave Summary</p>
            <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{employeeSummary.length} employees</span>
          </div>
          {employeeSummary.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
              <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No leave data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th className="text-center">Pending</th>
                    <th className="text-center">Approved</th>
                    <th className="text-center">Rejected</th>
                    <th className="text-right">Total Days Taken</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary
                    .sort((a, b) => b.totalDays - a.totalDays)
                    .map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                              style={{ background: "#2563EB" }}>
                              {emp.name.charAt(0)}
                            </div>
                            <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>{emp.name}</span>
                          </div>
                        </td>
                        <td className="text-[12px]" style={{ color: "#71717A" }}>
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </td>
                        <td className="text-center">
                          {emp.pending > 0
                            ? <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{emp.pending}</span>
                            : <span style={{ color: "#A1A1AA" }}>—</span>}
                        </td>
                        <td className="text-center">
                          {emp.approved > 0
                            ? <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{emp.approved}</span>
                            : <span style={{ color: "#A1A1AA" }}>—</span>}
                        </td>
                        <td className="text-center">
                          {emp.rejected > 0
                            ? <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{emp.rejected}</span>
                            : <span style={{ color: "#A1A1AA" }}>—</span>}
                        </td>
                        <td className="text-right">
                          <span className="text-[14px] font-bold" style={{ color: "#18181B" }}>{emp.totalDays}</span>
                          <span className="text-[11px] ml-1" style={{ color: "#A1A1AA" }}>days</span>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => {
                              setEmpFilter(emp.id);
                              setStatusFilter("ALL");
                              setActiveTab("requests");
                            }}
                            className="text-[12px] font-medium"
                            style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>
                            View all →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: On Leave Today ══════════════════════════════════ */}
      {activeTab === "today" && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid #E4E4E7" }}>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" style={{ color: "#7C3AED" }} />
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                Employees on Leave Today
              </p>
            </div>
            <span className="text-[12px]" style={{ color: "#A1A1AA" }}>
              {formatDate(new Date())}
            </span>
          </div>
          {onLeaveTodayList.length === 0 ? (
            <div className="py-14 text-center">
              <CalendarRange className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No employees on leave today</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>All staff are present</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F4F4F5" }}>
              {onLeaveTodayList.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                      style={{ background: "#7C3AED" }}>
                      {l.employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{l.employee.name}</p>
                      <p className="text-[12px]" style={{ color: "#71717A" }}>
                        {ROLE_LABELS[l.employee.role] ?? l.employee.role}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveTypeColor(l.leaveType)}`}>
                      {leaveTypeLabel(l.leaveType)}
                    </span>
                    <p className="text-[12px] mt-1" style={{ color: "#71717A" }}>
                      {formatDate(l.startDate)} – {formatDate(l.endDate)} · {l.totalDays} day{l.totalDays !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Modals ══════════════════════════════════════════════════ */}

      {/* View modal */}
      <Modal open={!!viewLeave} onClose={() => setViewLeave(null)} title="Leave Request Details" size="md">
        {viewLeave && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
                  style={{ background: "#7C3AED" }}>
                  {viewLeave.employee.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>{viewLeave.employee.name}</p>
                  <p className="text-[12px]" style={{ color: "#71717A" }}>
                    {ROLE_LABELS[viewLeave.employee.role] ?? viewLeave.employee.role}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[viewLeave.status]?.chip ?? ""}`}>
                {STATUS_STYLES[viewLeave.status]?.icon} {viewLeave.status}
              </span>
            </div>

            <div className="rounded-xl divide-y" style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}>
              {[
                ["Leave Type", <span key="lt" className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${leaveTypeColor(viewLeave.leaveType)}`}>{leaveTypeLabel(viewLeave.leaveType)}</span>],
                ["Start Date", formatDate(viewLeave.startDate)],
                ["End Date",   formatDate(viewLeave.endDate)],
                ["Duration",   `${viewLeave.totalDays} day${viewLeave.totalDays !== 1 ? "s" : ""}`],
                ["Applied On", formatDate(viewLeave.createdAt)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
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
              <div className="px-4 py-3 rounded-xl text-[13px] space-y-1"
                style={{
                  background: viewLeave.status === "APPROVED" ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${viewLeave.status === "APPROVED" ? "#86EFAC" : "#FCA5A5"}`,
                }}>
                <p className="font-semibold" style={{ color: viewLeave.status === "APPROVED" ? "#15803D" : "#B91C1C" }}>
                  {viewLeave.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"} by {viewLeave.reviewedBy.name}
                </p>
                {viewLeave.reviewNote && (
                  <p style={{ color: "#52525B" }}>{viewLeave.reviewNote}</p>
                )}
              </div>
            )}

            {viewLeave.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => { doApprove(viewLeave.id); setViewLeave(null); }}
                  className="btn flex-1 justify-center"
                  style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                </button>
                <button onClick={() => { setRejectLeave(viewLeave); setViewLeave(null); setRejectNote(""); }}
                  className="btn btn-danger flex-1 justify-center">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectLeave} onClose={() => { setRejectLeave(null); setRejectNote(""); }} title="Reject Leave Request" size="sm">
        {rejectLeave && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 text-[13px] space-y-1.5" style={{ background: "#F4F4F5" }}>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Employee</span>
                <span className="font-medium">{rejectLeave.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Leave Type</span>
                <span className="font-medium">{leaveTypeLabel(rejectLeave.leaveType)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#71717A" }}>Duration</span>
                <span className="font-medium">{rejectLeave.totalDays} day{rejectLeave.totalDays !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#18181B" }}>
                Reason for Rejection *
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this leave is being rejected…"
                rows={3}
                className="input resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectLeave(null); setRejectNote(""); }}
                className="btn btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={doReject} disabled={isPending || !rejectNote.trim()}
                className="btn btn-danger flex-1 justify-center">
                {isPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk action modal */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title={`Bulk ${bulkAction === "APPROVE" ? "Approve" : "Reject"}`} size="sm">
        <div className="space-y-4">
          <div className="px-4 py-3 rounded-xl text-[13px]"
            style={{ background: bulkAction === "APPROVE" ? "#F0FDF4" : "#FEF2F2",
              border: `1px solid ${bulkAction === "APPROVE" ? "#86EFAC" : "#FCA5A5"}` }}>
            <p style={{ color: bulkAction === "APPROVE" ? "#15803D" : "#B91C1C" }}>
              You are about to <strong>{bulkAction === "APPROVE" ? "approve" : "reject"}</strong> {selected.size} leave request{selected.size !== 1 ? "s" : ""}.
            </p>
          </div>
          {bulkAction === "REJECT" && (
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#18181B" }}>
                Reason for Rejection *
              </label>
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Common reason for rejecting these requests…"
                rows={3}
                className="input resize-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowBulkModal(false)}
              className="btn btn-secondary flex-1 justify-center">Cancel</button>
            <button
              onClick={doBulkAction}
              disabled={isPending || (bulkAction === "REJECT" && !bulkNote.trim())}
              className="btn flex-1 justify-center"
              style={bulkAction === "APPROVE"
                ? { background: "#16A34A", color: "#fff", border: "1px solid #16A34A" }
                : { background: "#DC2626", color: "#fff", border: "1px solid #DC2626" }}>
              {isPending ? "Processing…" : `Confirm ${bulkAction === "APPROVE" ? "Approve" : "Reject"}`}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
