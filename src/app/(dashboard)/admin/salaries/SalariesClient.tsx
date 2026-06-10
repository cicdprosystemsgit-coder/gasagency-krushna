"use client";

import { useState, useTransition, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/utils";
import {
  Plus, Wallet, Trash2, Users, AlertCircle, Gift,
  BadgeIndianRupee, ArrowDownCircle, RotateCcw, Settings,
  CheckCircle2, Clock, XCircle, Send, ShieldCheck,
} from "lucide-react";
import {
  createSalaryDrawing, deleteSalaryDrawing,
  createAdvance, deleteAdvance, recoverAdvance,
  createBonus, deleteBonus,
  setSalaryProfile,
} from "@/app/actions/salaries";
import {
  createSalaryRequest,
  approveSalaryRequest,
  rejectSalaryRequest,
} from "@/app/actions/salary-requests";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Drawing {
  id: string;
  date: Date | string;
  type: string;
  amount: number;
  month: number;
  year: number;
  remarks: string | null;
  employeeId: string;
  employee: { name: string; role: string };
}

interface Advance {
  id: string;
  advanceDate: Date | string;
  amount: number;
  recoveredAmount: number;
  balanceAmount: number;
  status: string;
  reason: string | null;
  notes: string | null;
  employee: { name: string; role: string };
  employeeId: string;
}

interface Bonus {
  id: string;
  bonusDate: Date | string;
  amount: number;
  month: number;
  year: number;
  reason: string | null;
  remarks: string | null;
  employee: { name: string; role: string };
  employeeId: string;
}

interface Profile {
  id: string;
  employeeId: string;
  monthlySalary: number;
  effectiveFrom: Date | string;
  notes: string | null;
  employee: { id: string; name: string; role: string; isActive: boolean };
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
  requestedBy: { name: string };
  reviewedBy: { name: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface SalariesClientProps {
  initialDrawings: Drawing[];
  initialAdvances: Advance[];
  initialBonuses: Bonus[];
  initialProfiles: Profile[];
  initialRequests: SalaryRequest[];
  staff: Staff[];
  currentMonth: number;
  currentYear: number;
  userRole: string;
  userId: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TABS_ADMIN = ["Payroll Overview","Salary History","Advances / Udhari","Bonuses","Salary Profiles","Approvals"] as const;
const TABS_MANAGER = ["Payroll Overview","Salary History","Advances / Udhari","Bonuses","Salary Profiles","My Requests"] as const;

const TYPE_COLORS: Record<string, string> = {
  SALARY: "bg-blue-100 text-blue-700",
  DRAWING: "bg-orange-100 text-orange-700",
  ADVANCE: "bg-red-100 text-red-700",
  ADVANCE_RECOVERY: "bg-emerald-100 text-emerald-700",
  BONUS: "bg-purple-100 text-purple-700",
  DEDUCTION: "bg-rose-100 text-rose-700",
};

const ADVANCE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  RECOVERED: "bg-green-100 text-green-700",
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalariesClient({
  initialDrawings, initialAdvances, initialBonuses,
  initialProfiles, initialRequests,
  staff, currentMonth, currentYear, userRole, userId,
}: SalariesClientProps) {
  const isAdmin = userRole === "ADMIN";
  const TABS = isAdmin ? TABS_ADMIN : TABS_MANAGER;

  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  const [drawings, setDrawings] = useState(initialDrawings);
  const [advances, setAdvances] = useState(initialAdvances);
  const [bonuses, setBonuses] = useState(initialBonuses);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [requests, setRequests] = useState(initialRequests);

  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selYear, setSelYear] = useState(currentYear);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salaries &amp; Drawings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Manage payroll, approve requests, and process payments"
              : "Submit salary requests for admin approval"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((tab) => {
          const isApprovalTab = tab === "Approvals" || tab === "My Requests";
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab}
              {isApprovalTab && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "Payroll Overview" && (
        <PayrollOverview
          staff={staff} profiles={profiles} drawings={drawings}
          advances={advances} bonuses={bonuses}
          month={selMonth} year={selYear} isAdmin={isAdmin}
          onDrawingAdded={(d) => setDrawings((prev) => [d, ...prev])}
          onAdvanceUpdated={(a) => setAdvances((prev) => prev.map((x) => (x.id === a.id ? a : x)))}
          onRequestAdded={(r) => setRequests((prev) => [r, ...prev])}
        />
      )}

      {activeTab === "Salary History" && (
        <SalaryHistory
          drawings={drawings} staff={staff} isAdmin={isAdmin}
          month={selMonth} year={selYear}
          onDelete={(id) => setDrawings((prev) => prev.filter((d) => d.id !== id))}
        />
      )}

      {activeTab === "Advances / Udhari" && (
        <AdvancesTab
          advances={advances} staff={staff} isAdmin={isAdmin}
          onAdvanceAdded={(a) => setAdvances((prev) => [a, ...prev])}
          onAdvanceUpdated={(a) => setAdvances((prev) => prev.map((x) => (x.id === a.id ? a : x)))}
          onAdvanceDeleted={(id) => setAdvances((prev) => prev.filter((a) => a.id !== id))}
          onRequestAdded={(r) => setRequests((prev) => [r, ...prev])}
        />
      )}

      {activeTab === "Bonuses" && (
        <BonusesTab
          bonuses={bonuses} staff={staff} isAdmin={isAdmin}
          month={selMonth} year={selYear}
          onBonusAdded={(b) => setBonuses((prev) => [b, ...prev])}
          onBonusDeleted={(id) => setBonuses((prev) => prev.filter((b) => b.id !== id))}
          onRequestAdded={(r) => setRequests((prev) => [r, ...prev])}
        />
      )}

      {activeTab === "Salary Profiles" && (
        <SalaryProfilesTab
          profiles={profiles} staff={staff} isAdmin={isAdmin}
          onProfileUpdated={(p) =>
            setProfiles((prev) => {
              const idx = prev.findIndex((x) => x.employeeId === p.employeeId);
              if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
              return [p, ...prev];
            })
          }
        />
      )}

      {(activeTab === "Approvals" || activeTab === "My Requests") && (
        <ApprovalsTab
          requests={requests} isAdmin={isAdmin}
          onRequestUpdated={(updated) =>
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
          }
        />
      )}
    </div>
  );
}

// ─── Tab 1: Payroll Overview ──────────────────────────────────────────────────

function PayrollOverview({
  staff, profiles, drawings, advances, bonuses,
  month, year, isAdmin, onDrawingAdded, onAdvanceUpdated, onRequestAdded,
}: {
  staff: Staff[];
  profiles: Profile[];
  drawings: Drawing[];
  advances: Advance[];
  bonuses: Bonus[];
  month: number;
  year: number;
  isAdmin: boolean;
  onDrawingAdded: (d: Drawing) => void;
  onAdvanceUpdated: (a: Advance) => void;
  onRequestAdded: (r: SalaryRequest) => void;
}) {
  const [payModal, setPayModal] = useState<Staff | null>(null);

  const employeeSummaries = useMemo(() => {
    return staff.filter((s) => s.role !== "SYSTEM_ADMIN").map((emp) => {
      const profile = profiles.find((p) => p.employeeId === emp.id);
      const monthDrawings = drawings.filter(
        (d) => d.month === month && d.year === year && d.employeeId === emp.id
      );
      const salaryPaid = monthDrawings.filter((d) => d.type === "SALARY").reduce((s, d) => s + d.amount, 0);
      const recoveryThisMonth = monthDrawings.filter((d) => d.type === "ADVANCE_RECOVERY").reduce((s, d) => s + d.amount, 0);
      const bonusThisMonth = bonuses.filter((b) => b.month === month && b.year === year && b.employeeId === emp.id).reduce((s, b) => s + b.amount, 0);
      const pendingAdvance = advances.filter((a) => a.employeeId === emp.id && (a.status === "PENDING" || a.status === "PARTIAL")).reduce((s, a) => s + a.balanceAmount, 0);
      const baseSalary = profile?.monthlySalary ?? 0;
      const netPayable = baseSalary + bonusThisMonth - salaryPaid - recoveryThisMonth;
      const isPaid = baseSalary > 0 && salaryPaid >= baseSalary;
      return { emp, profile, baseSalary, salaryPaid, recoveryThisMonth, bonusThisMonth, pendingAdvance, netPayable, isPaid };
    });
  }, [staff, profiles, drawings, advances, bonuses, month, year]);

  const totals = useMemo(() => ({
    totalPayable: employeeSummaries.reduce((s, e) => s + e.baseSalary + e.bonusThisMonth, 0),
    totalPaid: employeeSummaries.reduce((s, e) => s + e.salaryPaid, 0),
    totalAdvances: advances.filter((a) => a.status !== "RECOVERED").reduce((s, a) => s + a.balanceAmount, 0),
    totalBonus: employeeSummaries.reduce((s, e) => s + e.bonusThisMonth, 0),
  }), [employeeSummaries, advances]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={<BadgeIndianRupee className="w-5 h-5 text-blue-600" />} label="Total Payable" value={formatCurrency(totals.totalPayable)} color="blue" />
        <SummaryCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Total Paid" value={formatCurrency(totals.totalPaid)} color="green" />
        <SummaryCard icon={<AlertCircle className="w-5 h-5 text-red-500" />} label="Advances Outstanding" value={formatCurrency(totals.totalAdvances)} color="red" />
        <SummaryCard icon={<Gift className="w-5 h-5 text-purple-600" />} label={`Bonuses (${MONTHS[month-1]})`} value={formatCurrency(totals.totalBonus)} color="purple" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-700 text-sm">Payroll — {MONTH_NAMES[month - 1]} {year}</h2>
          <span className="ml-auto text-xs text-slate-400">{staff.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Base Salary</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Bonus</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Advance Bal.</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Paid</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Net Remaining</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.map(({ emp, profile, baseSalary, salaryPaid, bonusThisMonth, pendingAdvance, netPayable, isPaid }) => (
                <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{emp.name}</div>
                    {!profile && <div className="text-xs text-amber-600 mt-0.5">Salary not configured</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{ROLE_LABELS[emp.role] ?? emp.role}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">
                    {baseSalary > 0 ? formatCurrency(baseSalary) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {bonusThisMonth > 0 ? <span className="text-purple-700 font-medium">+{formatCurrency(bonusThisMonth)}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {pendingAdvance > 0 ? <span className="text-red-600 font-medium">{formatCurrency(pendingAdvance)}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-green-700 font-medium">
                    {salaryPaid > 0 ? formatCurrency(salaryPaid) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-bold">
                    <span className={netPayable > 0 ? "text-blue-700" : "text-slate-400"}>
                      {baseSalary > 0 ? formatCurrency(Math.max(0, netPayable)) : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {baseSalary === 0 ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-500">No Profile</span>
                    ) : isPaid ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">Paid</span>
                    ) : salaryPaid > 0 ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700">Partial</span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-600">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => setPayModal(emp)}
                      className={`flex items-center gap-1 mx-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                        isAdmin
                          ? "text-blue-700 bg-blue-50 hover:bg-blue-100"
                          : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                      }`}>
                      {isAdmin ? <Plus className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {isAdmin ? "Pay" : "Request"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payModal && (
        <PaySalaryModal
          emp={payModal} month={month} year={year} isAdmin={isAdmin}
          profile={profiles.find((p) => p.employeeId === payModal.id)}
          pendingAdvances={advances.filter((a) => a.employeeId === payModal.id && (a.status === "PENDING" || a.status === "PARTIAL"))}
          onClose={() => setPayModal(null)}
          onDirectSuccess={(drawing, updatedAdvances) => {
            onDrawingAdded(drawing);
            updatedAdvances.forEach((a) => onAdvanceUpdated(a));
            setPayModal(null);
          }}
          onRequestSuccess={(req) => { onRequestAdded(req); setPayModal(null); }}
        />
      )}
    </>
  );
}

// ─── Pay Salary Modal (admin = direct, manager = request) ─────────────────────

function PaySalaryModal({
  emp, month, year, profile, pendingAdvances, isAdmin, onClose, onDirectSuccess, onRequestSuccess,
}: {
  emp: Staff;
  month: number;
  year: number;
  profile?: Profile;
  pendingAdvances: Advance[];
  isAdmin: boolean;
  onClose: () => void;
  onDirectSuccess: (d: Drawing, updated: Advance[]) => void;
  onRequestSuccess: (r: SalaryRequest) => void;
}) {
  const totalPendingAdv = pendingAdvances.reduce((s, a) => s + a.balanceAmount, 0);
  const [form, setForm] = useState({
    type: "SALARY",
    amount: profile?.monthlySalary ? String(profile.monthlySalary) : "",
    advanceRecoveryAmount: "0",
    remarks: "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const baseAmount = Number(form.amount) || 0;
  const recovery = Math.min(Number(form.advanceRecoveryAmount) || 0, totalPendingAdv);
  const netDisburse = baseAmount - recovery;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!baseAmount || baseAmount <= 0) { setError("Valid amount required"); return; }
    if (recovery > totalPendingAdv) { setError(`Recovery cannot exceed pending balance of ${formatCurrency(totalPendingAdv)}`); return; }
    setError("");

    const fd = new FormData();
    fd.append("employeeId", emp.id);
    fd.append("type", form.type);
    fd.append("amount", String(baseAmount));
    fd.append("month", String(month));
    fd.append("year", String(year));
    fd.append("advanceRecoveryAmount", String(recovery));
    fd.append("remarks", form.remarks);

    startTransition(async () => {
      if (isAdmin) {
        const result = await createSalaryDrawing(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.drawing) {
          let remaining = recovery;
          const updated: Advance[] = [];
          for (const adv of pendingAdvances) {
            if (remaining <= 0) break;
            const canRecover = Math.min(remaining, adv.balanceAmount);
            const newBalance = adv.balanceAmount - canRecover;
            updated.push({ ...adv, recoveredAmount: adv.recoveredAmount + canRecover, balanceAmount: newBalance, status: newBalance <= 0 ? "RECOVERED" : "PARTIAL" });
            remaining -= canRecover;
          }
          onDirectSuccess(result.drawing as unknown as Drawing, updated);
        }
      } else {
        const result = await createSalaryRequest(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.request) onRequestSuccess(result.request as unknown as SalaryRequest);
      }
    });
  }

  return (
    <Modal open onClose={onClose}
      title={isAdmin ? `Pay Salary — ${emp.name}` : `Request Salary Payment — ${emp.name}`}
      size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <Send className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm">This request will be sent to admin for approval before payment is processed.</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

        {totalPendingAdv > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-1">
              <AlertCircle className="w-4 h-4" /> Pending Advance (Udhari)
            </div>
            <p className="text-red-700 text-sm">{emp.name} has <strong>{formatCurrency(totalPendingAdv)}</strong> outstanding. Enter recovery amount to deduct from this salary.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {["SALARY", "DRAWING"].map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                  form.type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                {t === "SALARY" ? "Monthly Salary" : "Owner Drawing"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Amount (₹) *
            {profile && <span className="ml-2 text-xs text-slate-400 font-normal">Base: {formatCurrency(profile.monthlySalary)}</span>}
          </label>
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {totalPendingAdv > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Advance Recovery (₹)
              <span className="ml-2 text-xs text-slate-400 font-normal">Max: {formatCurrency(totalPendingAdv)}</span>
            </label>
            <input type="number" min="0" step="0.01" max={totalPendingAdv}
              value={form.advanceRecoveryAmount}
              onChange={(e) => setForm({ ...form, advanceRecoveryAmount: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {baseAmount > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{form.type === "SALARY" ? "Salary" : "Drawing"}</span>
              <span className="font-medium">{formatCurrency(baseAmount)}</span>
            </div>
            {recovery > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Advance Recovery</span>
                <span className="font-medium">− {formatCurrency(recovery)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5 mt-1">
              <span>Net to Disburse</span>
              <span className="text-blue-700">{formatCurrency(Math.max(0, netDisburse))}</span>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg px-4 py-2 text-sm text-slate-500">
          Period: <span className="font-semibold text-slate-700">{MONTH_NAMES[month - 1]} {year}</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks</label>
          <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="e.g., June salary paid in full"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition flex items-center gap-2 ${
              isAdmin ? "bg-blue-700 hover:bg-blue-800" : "bg-amber-600 hover:bg-amber-700"
            }`}>
            {isPending ? "Saving..." : isAdmin ? "Save Payment" : <><Send className="w-3.5 h-3.5" /> Submit for Approval</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tab 2: Salary History ────────────────────────────────────────────────────

function SalaryHistory({ drawings, staff, isAdmin, month, year, onDelete }: {
  drawings: Drawing[]; staff: Staff[]; isAdmin: boolean;
  month: number; year: number; onDelete: (id: string) => void;
}) {
  const [filterEmp, setFilterEmp] = useState("");
  const [filterMonth, setFilterMonth] = useState(String(month));
  const [filterYear, setFilterYear] = useState(String(year));
  const [filterType, setFilterType] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => drawings.filter((d) => {
    if (filterEmp && d.employeeId !== filterEmp) return false;
    if (filterMonth && d.month !== Number(filterMonth)) return false;
    if (filterYear && d.year !== Number(filterYear)) return false;
    if (filterType && d.type !== filterType) return false;
    return true;
  }), [drawings, filterEmp, filterMonth, filterYear, filterType]);

  const totals = useMemo(() => ({
    salary: filtered.filter((d) => d.type === "SALARY").reduce((s, d) => s + d.amount, 0),
    drawing: filtered.filter((d) => d.type === "DRAWING").reduce((s, d) => s + d.amount, 0),
    advance: filtered.filter((d) => d.type === "ADVANCE").reduce((s, d) => s + d.amount, 0),
    bonus: filtered.filter((d) => d.type === "BONUS").reduce((s, d) => s + d.amount, 0),
  }), [filtered]);

  function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    startTransition(async () => {
      const result = await deleteSalaryDrawing(id);
      if (result.success) onDelete(id);
    });
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Salaries", amount: totals.salary, color: "text-blue-700" },
          { label: "Drawings", amount: totals.drawing, color: "text-orange-600" },
          { label: "Advances", amount: totals.advance, color: "text-red-600" },
          { label: "Bonuses", amount: totals.bonus, color: "text-purple-700" },
        ].map(({ label, amount, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Employees</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Years</option>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {["SALARY","DRAWING","ADVANCE","ADVANCE_RECOVERY","BONUS","DEDUCTION"].map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-500 self-center">{filtered.length} records</span>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Period</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Remarks</th>
                {isAdmin && <th className="px-5 py-3 text-center font-semibold text-slate-600">Del</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-5 py-14 text-center">
                  <Wallet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400">No records for selected filters</p>
                </td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-500">{formatDate(d.date)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{d.employee.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[d.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {d.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{MONTHS[d.month - 1]} {d.year}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{formatCurrency(d.amount)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-[180px] truncate">{d.remarks ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleDelete(d.id)} disabled={isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab 3: Advances / Udhari ─────────────────────────────────────────────────

function AdvancesTab({ advances, staff, isAdmin, onAdvanceAdded, onAdvanceUpdated, onAdvanceDeleted, onRequestAdded }: {
  advances: Advance[]; staff: Staff[]; isAdmin: boolean;
  onAdvanceAdded: (a: Advance) => void;
  onAdvanceUpdated: (a: Advance) => void;
  onAdvanceDeleted: (id: string) => void;
  onRequestAdded: (r: SalaryRequest) => void;
}) {
  const [addModal, setAddModal] = useState(false);
  const [recoverModal, setRecoverModal] = useState<Advance | null>(null);
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [filterEmp, setFilterEmp] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => advances.filter((a) => {
    if (filterStatus === "ACTIVE" && a.status === "RECOVERED") return false;
    if (filterStatus === "RECOVERED" && a.status !== "RECOVERED") return false;
    if (filterEmp && a.employeeId !== filterEmp) return false;
    return true;
  }), [advances, filterStatus, filterEmp]);

  const totalOutstanding = advances.filter((a) => a.status !== "RECOVERED").reduce((s, a) => s + a.balanceAmount, 0);

  function handleDelete(id: string) {
    if (!confirm("Delete this advance?")) return;
    startTransition(async () => {
      const result = await deleteAdvance(id);
      if (result.success) onAdvanceDeleted(id);
      else alert((result as { error?: string }).error ?? "Cannot delete");
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500">Active Advances</p>
          <p className="text-xl font-bold text-slate-800">{advances.filter((a) => a.status !== "RECOVERED").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500">Fully Recovered</p>
          <p className="text-xl font-bold text-green-700">{advances.filter((a) => a.status === "RECOVERED").length}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ACTIVE">Active</option>
          <option value="RECOVERED">Recovered</option>
          <option value="">All</option>
        </select>
        <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Employees</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setAddModal(true)}
          className={`ml-auto flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition ${
            isAdmin ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
          }`}>
          {isAdmin ? <Plus className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {isAdmin ? "Give Advance" : "Request Advance"}
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Advance</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Recovered</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Balance</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Reason</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-14 text-center">
                  <ArrowDownCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400">No advances found</p>
                </td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{a.employee.name}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABELS[a.employee.role] ?? a.employee.role}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(a.advanceDate)}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(a.amount)}</td>
                  <td className="px-5 py-3 text-right text-green-700">{formatCurrency(a.recoveredAmount)}</td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">
                    {a.status === "RECOVERED" ? <span className="text-slate-400 font-normal">—</span> : formatCurrency(a.balanceAmount)}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-[140px] truncate">{a.reason ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ADVANCE_STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {a.status !== "RECOVERED" && (
                        <button onClick={() => setRecoverModal(a)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
                            isAdmin
                              ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                          }`}>
                          {isAdmin ? <RotateCcw className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                          {isAdmin ? "Recover" : "Request"}
                        </button>
                      )}
                      {isAdmin && a.recoveredAmount === 0 && (
                        <button onClick={() => handleDelete(a.id)} disabled={isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && (
        <AddAdvanceModal staff={staff} isAdmin={isAdmin}
          onClose={() => setAddModal(false)}
          onDirectSuccess={(a) => { onAdvanceAdded(a); setAddModal(false); }}
          onRequestSuccess={(r) => { onRequestAdded(r); setAddModal(false); }}
        />
      )}

      {recoverModal && (
        <RecoverAdvanceModal advance={recoverModal} isAdmin={isAdmin}
          onClose={() => setRecoverModal(null)}
          onDirectSuccess={(a) => { onAdvanceUpdated(a); setRecoverModal(null); }}
          onRequestSuccess={(r) => { onRequestAdded(r); setRecoverModal(null); }}
        />
      )}
    </>
  );
}

function AddAdvanceModal({ staff, isAdmin, onClose, onDirectSuccess, onRequestSuccess }: {
  staff: Staff[]; isAdmin: boolean;
  onClose: () => void;
  onDirectSuccess: (a: Advance) => void;
  onRequestSuccess: (r: SalaryRequest) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ employeeId: "", amount: "", advanceDate: today, reason: "", notes: "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId) { setError("Select an employee"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Valid amount required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      if (isAdmin) {
        const result = await createAdvance(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.advance) onDirectSuccess(result.advance as unknown as Advance);
      } else {
        fd.append("type", "ADVANCE");
        const result = await createSalaryRequest(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.request) onRequestSuccess(result.request as unknown as SalaryRequest);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={isAdmin ? "Give Advance (Udhari)" : "Request Advance"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <Send className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm">This advance request will be sent to admin for approval.</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee *</label>
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select employee...</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({ROLE_LABELS[s.role] ?? s.role})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" value={form.advanceDate}
              onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g., Medical emergency, Festival advance..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition flex items-center gap-2 ${
              isAdmin ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}>
            {isPending ? "Saving..." : isAdmin ? "Give Advance" : <><Send className="w-3.5 h-3.5" />Submit Request</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RecoverAdvanceModal({ advance, isAdmin, onClose, onDirectSuccess, onRequestSuccess }: {
  advance: Advance; isAdmin: boolean;
  onClose: () => void;
  onDirectSuccess: (a: Advance) => void;
  onRequestSuccess: (r: SalaryRequest) => void;
}) {
  const [amount, setAmount] = useState(String(advance.balanceAmount));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) { setError("Valid amount required"); return; }
    if (val > advance.balanceAmount) { setError(`Cannot exceed balance of ${formatCurrency(advance.balanceAmount)}`); return; }
    startTransition(async () => {
      if (isAdmin) {
        const fd = new FormData();
        fd.append("advanceId", advance.id);
        fd.append("recoveryAmount", String(val));
        const result = await recoverAdvance(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.advance) onDirectSuccess(result.advance as unknown as Advance);
      } else {
        const fd = new FormData();
        fd.append("type", "ADVANCE_RECOVERY");
        fd.append("employeeId", advance.employeeId);
        fd.append("amount", String(val));
        fd.append("advanceId", advance.id);
        fd.append("remarks", `Recovery for advance of ${formatCurrency(advance.amount)}`);
        const result = await createSalaryRequest(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.request) onRequestSuccess(result.request as unknown as SalaryRequest);
      }
    });
  }

  return (
    <Modal open onClose={onClose}
      title={isAdmin ? `Recover Advance — ${advance.employee.name}` : `Request Recovery — ${advance.employee.name}`}
      size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <Send className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm">Recovery request will be sent to admin for approval.</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Total Advance</span><span className="font-medium">{formatCurrency(advance.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Already Recovered</span><span className="font-medium text-green-700">{formatCurrency(advance.recoveredAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="font-semibold text-slate-700">Balance</span><span className="font-bold text-red-600">{formatCurrency(advance.balanceAmount)}</span></div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Recovery Amount (₹) *
            <span className="ml-2 text-xs text-slate-400 font-normal">Max: {formatCurrency(advance.balanceAmount)}</span>
          </label>
          <input type="number" min="0.01" step="0.01" max={advance.balanceAmount} value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition flex items-center gap-2 ${
              isAdmin ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
            }`}>
            {isPending ? "Saving..." : isAdmin ? "Mark Recovered" : <><Send className="w-3.5 h-3.5" />Submit Request</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tab 4: Bonuses ───────────────────────────────────────────────────────────

function BonusesTab({ bonuses, staff, isAdmin, month, year, onBonusAdded, onBonusDeleted, onRequestAdded }: {
  bonuses: Bonus[]; staff: Staff[]; isAdmin: boolean; month: number; year: number;
  onBonusAdded: (b: Bonus) => void;
  onBonusDeleted: (id: string) => void;
  onRequestAdded: (r: SalaryRequest) => void;
}) {
  const [addModal, setAddModal] = useState(false);
  const [filterEmp, setFilterEmp] = useState("");
  const [filterMonth, setFilterMonth] = useState(String(month));
  const [filterYear, setFilterYear] = useState(String(year));
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => bonuses.filter((b) => {
    if (filterEmp && b.employeeId !== filterEmp) return false;
    if (filterMonth && b.month !== Number(filterMonth)) return false;
    if (filterYear && b.year !== Number(filterYear)) return false;
    return true;
  }), [bonuses, filterEmp, filterMonth, filterYear]);

  function handleDelete(id: string) {
    if (!confirm("Delete this bonus record?")) return;
    startTransition(async () => {
      const result = await deleteBonus(id);
      if (result.success) onBonusDeleted(id);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Gift className="w-5 h-5 text-purple-500" />
          <div>
            <p className="text-xs text-slate-500">Total (filtered)</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(filtered.reduce((s, b) => s + b.amount, 0))}</p>
          </div>
        </div>
        <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Employees</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Years</option>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setAddModal(true)}
          className={`ml-auto flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition ${
            isAdmin ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-600 hover:bg-amber-700"
          }`}>
          {isAdmin ? <Plus className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {isAdmin ? "Add Bonus" : "Request Bonus"}
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Period</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Reason</th>
                {isAdmin && <th className="px-5 py-3 text-center font-semibold text-slate-600">Del</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-5 py-14 text-center">
                  <Gift className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400">No bonuses found</p>
                </td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{b.employee.name}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABELS[b.employee.role] ?? b.employee.role}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(b.bonusDate)}</td>
                  <td className="px-5 py-3 text-slate-500">{MONTHS[b.month - 1]} {b.year}</td>
                  <td className="px-5 py-3 text-right font-bold text-purple-700">{formatCurrency(b.amount)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{b.reason ?? b.remarks ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleDelete(b.id)} disabled={isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {addModal && (
        <AddBonusModal staff={staff} isAdmin={isAdmin} defaultMonth={month} defaultYear={year}
          onClose={() => setAddModal(false)}
          onDirectSuccess={(b) => { onBonusAdded(b); setAddModal(false); }}
          onRequestSuccess={(r) => { onRequestAdded(r); setAddModal(false); }}
        />
      )}
    </>
  );
}

function AddBonusModal({ staff, isAdmin, defaultMonth, defaultYear, onClose, onDirectSuccess, onRequestSuccess }: {
  staff: Staff[]; isAdmin: boolean; defaultMonth: number; defaultYear: number;
  onClose: () => void;
  onDirectSuccess: (b: Bonus) => void;
  onRequestSuccess: (r: SalaryRequest) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    employeeId: "", amount: "", bonusDate: today,
    month: String(defaultMonth), year: String(defaultYear), reason: "", remarks: "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId) { setError("Select an employee"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Valid amount required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      if (isAdmin) {
        const result = await createBonus(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.bonus) onDirectSuccess(result.bonus as unknown as Bonus);
      } else {
        fd.append("type", "BONUS");
        const result = await createSalaryRequest(fd);
        if ("error" in result && result.error) { setError(result.error); return; }
        if (result.request) onRequestSuccess(result.request as unknown as SalaryRequest);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={isAdmin ? "Add Bonus" : "Request Bonus"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <Send className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm">Bonus request will be sent to admin for approval.</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee *</label>
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select employee...</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({ROLE_LABELS[s.role] ?? s.role})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bonus Date *</label>
            <input type="date" value={form.bonusDate}
              onChange={(e) => setForm({ ...form, bonusDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">For Month *</label>
            <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year *</label>
            <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g., Diwali bonus, Performance bonus..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition flex items-center gap-2 ${
              isAdmin ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-600 hover:bg-amber-700"
            }`}>
            {isPending ? "Saving..." : isAdmin ? "Add Bonus" : <><Send className="w-3.5 h-3.5" />Submit Request</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tab 5: Salary Profiles ───────────────────────────────────────────────────

function SalaryProfilesTab({ profiles, staff, isAdmin, onProfileUpdated }: {
  profiles: Profile[]; staff: Staff[]; isAdmin: boolean;
  onProfileUpdated: (p: Profile) => void;
}) {
  const [editModal, setEditModal] = useState<Staff | null>(null);
  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => { m[p.employeeId] = p; });
    return m;
  }, [profiles]);

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-xs text-slate-500">Configured</p>
            <p className="text-lg font-bold text-slate-800">{staff.filter((s) => profileMap[s.id]).length} / {staff.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500">Monthly Payroll</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(profiles.reduce((s, p) => s + p.monthlySalary, 0))}</p>
        </div>
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> Salary profiles are managed by Admin only.
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Monthly Salary</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Effective From</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Notes</th>
                {isAdmin && <th className="px-5 py-3 text-center font-semibold text-slate-600">Action</th>}
              </tr>
            </thead>
            <tbody>
              {staff.filter((s) => s.role !== "SYSTEM_ADMIN").map((emp) => {
                const p = profileMap[emp.id];
                return (
                  <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{emp.name}</div>
                      <div className={`text-xs mt-0.5 ${emp.isActive ? "text-green-600" : "text-slate-400"}`}>{emp.isActive ? "Active" : "Inactive"}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{ROLE_LABELS[emp.role] ?? emp.role}</td>
                    <td className="px-5 py-3 text-right">
                      {p ? <span className="font-bold text-blue-700">{formatCurrency(p.monthlySalary)}</span>
                         : <span className="text-amber-600 text-xs font-semibold">Not Set</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{p ? formatDate(p.effectiveFrom) : "—"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{p?.notes ?? "—"}</td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => setEditModal(emp)}
                          className="flex items-center gap-1 mx-auto text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition">
                          <Settings className="w-3.5 h-3.5" /> {p ? "Edit" : "Set Salary"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editModal && (
        <SetSalaryProfileModal emp={editModal} existing={profileMap[editModal.id]}
          onClose={() => setEditModal(null)}
          onSuccess={(p) => { onProfileUpdated(p); setEditModal(null); }}
        />
      )}
    </>
  );
}

function SetSalaryProfileModal({ emp, existing, onClose, onSuccess }: {
  emp: Staff; existing?: Profile;
  onClose: () => void;
  onSuccess: (p: Profile) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    monthlySalary: existing ? String(existing.monthlySalary) : "",
    effectiveFrom: existing ? new Date(existing.effectiveFrom).toISOString().split("T")[0] : today,
    notes: existing?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monthlySalary || Number(form.monthlySalary) <= 0) { setError("Valid salary required"); return; }
    const fd = new FormData();
    fd.append("employeeId", emp.id);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await setSalaryProfile(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      if (result.profile) onSuccess(result.profile as unknown as Profile);
    });
  }

  return (
    <Modal open onClose={onClose} title={`${existing ? "Edit" : "Set"} Salary — ${emp.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Salary (₹) *</label>
          <input type="number" min="0.01" step="0.01" value={form.monthlySalary}
            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} placeholder="e.g., 15000"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Effective From *</label>
          <input type="date" value={form.effectiveFrom}
            onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g., Revised after appraisal..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition">
            {isPending ? "Saving..." : existing ? "Update Salary" : "Set Salary"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tab 6: Approvals (admin) / My Requests (manager) ─────────────────────────

function ApprovalsTab({ requests, isAdmin, onRequestUpdated }: {
  requests: SalaryRequest[];
  isAdmin: boolean;
  onRequestUpdated: (r: SalaryRequest) => void;
}) {
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [rejectModal, setRejectModal] = useState<SalaryRequest | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => requests.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  }), [requests, filterStatus]);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  function handleApprove(id: string) {
    if (!confirm("Approve this payment request? This will process the actual payment immediately.")) return;
    startTransition(async () => {
      const result = await approveSalaryRequest(id);
      if ("error" in result && result.error) { alert(result.error); return; }
      if (result.request) onRequestUpdated(result.request as unknown as SalaryRequest);
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Pending Approval</p>
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Approved</p>
            <p className="text-xl font-bold text-green-600">{approvedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg"><XCircle className="w-5 h-5 text-red-500" /></div>
          <div>
            <p className="text-xs text-slate-500">Rejected</p>
            <p className="text-xl font-bold text-red-500">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["PENDING","APPROVED","REJECTED",""].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
              filterStatus === s
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}>
            {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400 self-center">{filtered.length} requests</span>
      </div>

      {/* Info banner for admin */}
      {isAdmin && pendingCount > 0 && filterStatus === "PENDING" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-blue-800 text-sm">
            <strong>{pendingCount} payment request{pendingCount > 1 ? "s" : ""}</strong> from manager waiting for your approval.
            Review carefully before approving — approving will immediately process the payment.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Period</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Remarks / Details</th>
                {isAdmin && <th className="px-5 py-3 text-left font-semibold text-slate-600">Requested By</th>}
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                {isAdmin && <th className="px-5 py-3 text-center font-semibold text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 7} className="px-5 py-14 text-center">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400">
                    {filterStatus === "PENDING"
                      ? isAdmin ? "No pending requests — all caught up!" : "No pending requests submitted"
                      : "No requests found"}
                  </p>
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className={`border-b border-slate-50 last:border-0 ${r.status === "PENDING" ? "bg-amber-50/30" : ""}`}>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{r.employee.name}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABELS[r.employee.role] ?? r.employee.role}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {r.month && r.year ? `${MONTHS[r.month - 1]} ${r.year}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{formatCurrency(r.amount)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-[160px]">
                    <div className="truncate">{r.remarks ?? "—"}</div>
                    {r.status === "REJECTED" && r.reviewNote && (
                      <div className="text-red-600 mt-1 font-medium">Reason: {r.reviewNote}</div>
                    )}
                    {r.type === "SALARY" && Number((r.requestData as Record<string, unknown>).advanceRecoveryAmount ?? 0) > 0 && (
                      <div className="text-emerald-600 mt-0.5">Advance recovery: {formatCurrency(Number((r.requestData as Record<string, unknown>).advanceRecoveryAmount))}</div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-slate-500 text-xs">{r.requestedBy.name}</td>
                  )}
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${REQUEST_STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status === "PENDING" ? "⏳ Pending" : r.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    </span>
                    {r.status !== "PENDING" && r.reviewedBy && (
                      <div className="text-xs text-slate-400 mt-1">by {r.reviewedBy.name}</div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-center">
                      {r.status === "PENDING" && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleApprove(r.id)} disabled={isPending}
                            className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => setRejectModal(r)} disabled={isPending}
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectModal && (
        <RejectModal request={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={(updated) => { onRequestUpdated(updated); setRejectModal(null); }}
        />
      )}
    </>
  );
}

function RejectModal({ request, onClose, onSuccess }: {
  request: SalaryRequest;
  onClose: () => void;
  onSuccess: (r: SalaryRequest) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) { setError("Please provide a reason for rejection"); return; }
    startTransition(async () => {
      const result = await rejectSalaryRequest(request.id, note.trim());
      if ("error" in result && result.error) { setError(result.error); return; }
      if (result.request) onSuccess(result.request as unknown as SalaryRequest);
    });
  }

  return (
    <Modal open onClose={onClose} title="Reject Request" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 text-sm">
          <div className="flex justify-between mb-1"><span className="text-slate-500">Employee</span><span className="font-medium">{request.employee.name}</span></div>
          <div className="flex justify-between mb-1"><span className="text-slate-500">Type</span><span className="font-medium">{request.type.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold">{formatCurrency(request.amount)}</span></div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason for Rejection *</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="Explain why this request is being rejected..."
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition">
            {isPending ? "Rejecting..." : "Reject Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string;
  color: "blue" | "green" | "red" | "purple";
}) {
  const bg = { blue: "bg-blue-50", green: "bg-green-50", red: "bg-red-50", purple: "bg-purple-50" }[color];
  const text = { blue: "text-blue-700", green: "text-green-700", red: "text-red-600", purple: "text-purple-700" }[color];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bg}`}>{icon}</div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
    </div>
  );
}
