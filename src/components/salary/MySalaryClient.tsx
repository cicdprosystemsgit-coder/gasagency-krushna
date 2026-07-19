"use client";

import { useState } from "react";
import {
  Wallet, TrendingUp, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Calendar, Gift, CreditCard, Info,
  Banknote, Download, Loader2, CheckCircle2, XCircle, Plus, Coins, Check, FileText
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateSalarySlipPDF } from "@/lib/generateSalarySlipPDF";
import { createSalaryRequest } from "@/app/actions/salary-requests";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalaryProfile {
  id: string;
  monthlySalary: number;
  effectiveFrom: Date | string;
  notes: string | null;
}

export interface Drawing {
  id: string;
  type: string;
  amount: number;
  month: number;
  year: number;
  date: Date | string;
  remarks: string | null;
}

export interface Advance {
  id: string;
  amount: number;
  recoveredAmount: number;
  balanceAmount: number;
  advanceDate: Date | string;
  reason: string | null;
  notes: string | null;
  status: string;
}

export interface Bonus {
  id: string;
  amount: number;
  bonusDate: Date | string;
  month: number;
  year: number;
  reason: string | null;
  remarks: string | null;
}

export interface SalaryPaymentRequest {
  id: string;
  type: string;
  amount: number;
  month: number | null;
  year: number | null;
  status: string;
  remarks: string | null;
  managerReviewNote: string | null;
  reviewNote: string | null;
  createdAt: Date | string;
  requestedBy: { name: string };
  reviewedBy: { name: string } | null;
  managerReviewedBy: { name: string } | null;
}

export interface MySalaryClientProps {
  profile: SalaryProfile | null;
  drawings: Drawing[];
  advances: Advance[];
  bonuses: Bonus[];
  requests?: SalaryPaymentRequest[];
  employeeId: string;
  employeeName: string;
  agencyName?: string;
  agencyAddress?: string;
  agencyPhone?: string;
  agencyGstin?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string; sign: 1 | -1 }> = {
  SALARY:           { label: "Salary",           color: "#2563EB", bg: "#EFF6FF",  sign: 1  },
  DRAWING:          { label: "Drawing",           color: "#7C3AED", bg: "#F5F3FF",  sign: 1  },
  ADVANCE:          { label: "Advance (Udhari)",  color: "#DC2626", bg: "#FEF2F2",  sign: -1 },
  ADVANCE_RECOVERY: { label: "Advance Recovery",  color: "#059669", bg: "#ECFDF5",  sign: 1  },
  BONUS:            { label: "Bonus",             color: "#D97706", bg: "#FFFBEB",  sign: 1  },
};

const ADVANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "⏳ Pending",   color: "#D97706", bg: "#FFFBEB" },
  PARTIAL:   { label: "◑ Partial",    color: "#2563EB", bg: "#EFF6FF" },
  RECOVERED: { label: "✓ Recovered",  color: "#059669", bg: "#ECFDF5" },
};

const TABS = ["Overview", "Payslips", "Advances", "Bonuses", "My Requests"] as const;
type Tab = typeof TABS[number];

// ─── Component ────────────────────────────────────────────────────────────────

export function MySalaryClient({
  profile,
  drawings,
  advances,
  bonuses,
  requests = [],
  employeeId,
  employeeName,
  agencyName = "",
  agencyAddress = "",
  agencyPhone = "",
  agencyGstin = ""
}: MySalaryClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  const now = new Date();
  const currentYear = now.getFullYear();

  // Derived values
  const netPay = profile ? profile.monthlySalary : 0;

  const pendingAdvanceBalance = advances
    .filter((a) => a.status !== "RECOVERED")
    .reduce((s, a) => s + a.balanceAmount, 0);

  const ytdBonus = bonuses
    .filter((b) => b.year === currentYear)
    .reduce((s, b) => s + b.amount, 0);

  const ytdSalaryDrawings = drawings
    .filter((d) => d.year === currentYear && (d.type === "SALARY" || d.type === "DRAWING"))
    .reduce((s, d) => s + d.amount, 0);

  const lastPayment = drawings
    .filter((d) => d.type === "SALARY" || d.type === "DRAWING")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const availableYears = Array.from(new Set([
    ...drawings.map((d) => d.year),
    ...bonuses.map((b) => b.year),
    currentYear,
  ])).sort((a, b) => b - a);

  return (
    <div>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
          My Salary & Earnings
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
          View your personal salary details, payment history, and advance balance.
        </p>
      </div>

      {/* Pending advance warning banner */}
      {pendingAdvanceBalance > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>
              Advance (Udhari) Balance: {formatCurrency(pendingAdvanceBalance)}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#B45309" }}>
              This amount will be recovered from your upcoming salary payments.
            </p>
          </div>
        </div>
      )}

      {/* Quick stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Net Monthly Pay",
            val: profile ? formatCurrency(netPay) : "Not configured",
            icon: <Wallet className="w-4 h-4" />,
            color: "#2563EB", bg: "#EFF6FF",
            sub: profile ? "After all deductions" : "Ask admin to configure",
          },
          {
            label: "Last Salary Received",
            val: lastPayment ? formatCurrency(lastPayment.amount) : "—",
            icon: <Banknote className="w-4 h-4" />,
            color: "#16A34A", bg: "#F0FDF4",
            sub: lastPayment ? formatDate(lastPayment.date) : "No payment yet",
          },
          {
            label: "Advance Balance",
            val: formatCurrency(pendingAdvanceBalance),
            icon: <CreditCard className="w-4 h-4" />,
            color: pendingAdvanceBalance > 0 ? "#D97706" : "#16A34A",
            bg: pendingAdvanceBalance > 0 ? "#FFFBEB" : "#F0FDF4",
            sub: pendingAdvanceBalance > 0 ? "Pending recovery" : "No dues",
          },
          {
            label: `Bonus ${currentYear}`,
            val: formatCurrency(ytdBonus),
            icon: <Gift className="w-4 h-4" />,
            color: "#7C3AED", bg: "#F5F3FF",
            sub: `${bonuses.filter((b) => b.year === currentYear).length} bonus(es) this year`,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4"
            style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#71717A" }}>{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-[17px] font-bold leading-none mb-1" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Overview"  && <OverviewTab profile={profile} netPay={netPay} ytdSalary={ytdSalaryDrawings} ytdBonus={ytdBonus} drawings={drawings} advances={advances} currentYear={currentYear} />}
      {activeTab === "Payslips"  && <PayslipsTab drawings={drawings} bonuses={bonuses} yearFilter={yearFilter} setYearFilter={setYearFilter} availableYears={availableYears} employeeName={employeeName} agencyName={agencyName} agencyAddress={agencyAddress} agencyPhone={agencyPhone} agencyGstin={agencyGstin} profile={profile} />}
      {activeTab === "Advances"  && <AdvancesTab advances={advances} pendingBalance={pendingAdvanceBalance} />}
      {activeTab === "Bonuses"   && <BonusesTab bonuses={bonuses} ytdBonus={ytdBonus} currentYear={currentYear} />}
      {activeTab === "My Requests" && <MyRequestsTab initialRequests={requests} employeeId={employeeId} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile, netPay, ytdSalary, ytdBonus, drawings, advances, currentYear }: {
  profile: SalaryProfile | null;
  netPay: number;
  ytdSalary: number; ytdBonus: number;
  drawings: Drawing[]; advances: Advance[];
  currentYear: number;
}) {
  const recentPayments = drawings
    .filter((d) => d.type === "SALARY" || d.type === "DRAWING")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingAdvances = advances.filter((a) => a.status !== "RECOVERED");

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Salary Card */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #E4E4E7", background: "#F9FAFB" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Salary Configuration</p>
            <p className="text-[12px]" style={{ color: "#71717A" }}>Monthly pay set by admin</p>
          </div>
        </div>

        {profile ? (
          <div className="p-5">
            {/* Net salary display */}
            <div className="flex items-center justify-between text-[14px] py-4 px-5 rounded-xl mb-4"
              style={{ background: "#18181B", color: "#fff" }}>
              <span className="font-bold">Monthly Salary</span>
              <span className="font-extrabold text-[22px]" style={{ color: "#60A5FA" }}>{formatCurrency(netPay)}</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[13px] py-2 px-3 rounded-lg"
                style={{ background: "#F4F4F5" }}>
                <span style={{ color: "#52525B" }}>Effective from</span>
                <span className="font-semibold" style={{ color: "#18181B" }}>{formatDate(profile.effectiveFrom)}</span>
              </div>
              {profile.notes && (
                <div className="px-3 py-2.5 rounded-lg text-[12px]"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                  <strong>Note:</strong> {profile.notes}
                </div>
              )}
            </div>

            <div className="mt-4 p-3 rounded-lg text-[12px]"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
              <Info className="w-3.5 h-3.5 inline mr-1.5" />
              This is your configured monthly salary. Actual payment may vary based on advance deductions or bonuses.
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
            <Info className="w-8 h-8 mx-auto mb-2.5" style={{ color: "#D4D4D8" }} />
            <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>Salary profile not configured</p>
            <p className="text-[12px] mt-1" style={{ color: "#A1A1AA" }}>Contact your admin to set up your salary.</p>
          </div>
        )}
      </div>

      {/* Right: YTD + Recent + Pending Advances */}
      <div className="space-y-5">
        {/* YTD Summary */}
        <div className="rounded-xl p-5"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: "#16A34A" }} />
            <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Year-to-Date ({currentYear})</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Salary Paid", val: formatCurrency(ytdSalary), color: "#2563EB", bg: "#EFF6FF" },
              { label: "Bonuses",     val: formatCurrency(ytdBonus),  color: "#D97706", bg: "#FFFBEB" },
              { label: "Payments",    val: drawings.filter((d) => d.year === currentYear && (d.type === "SALARY" || d.type === "DRAWING")).length, color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Advances",    val: advances.filter((a) => new Date(a.advanceDate).getFullYear() === currentYear).length, color: "#DC2626", bg: "#FEF2F2" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg px-3 py-2.5 text-center"
                style={{ background: s.bg }}>
                <p className="text-[11px] font-medium mb-0.5" style={{ color: "#71717A" }}>{s.label}</p>
                <p className="text-[17px] font-bold" style={{ color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Recent Payments</p>
          </div>
          {recentPayments.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1.5" style={{ color: "#D4D4D8" }} />
              <p className="text-[12px]" style={{ color: "#A1A1AA" }}>No payment records yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentPayments.map((d) => {
                const t = TYPE_LABELS[d.type] ?? { label: d.type, color: "#52525B", bg: "#F4F4F5", sign: 1 as const };
                return (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>
                        {MONTHS[(d.month ?? 1) - 1]} {d.year}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>{formatDate(d.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold" style={{ color: t.color }}>
                        {formatCurrency(d.amount)}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold`}
                        style={{ background: t.bg, color: t.color }}>
                        {t.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending advances summary */}
        {pendingAdvances.length > 0 && (
          <div className="rounded-xl p-4"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: "#D97706" }} />
              <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>Pending Advances</p>
            </div>
            <div className="space-y-2">
              {pendingAdvances.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "#78350F" }}>{formatDate(a.advanceDate)} — {a.reason ?? "Advance"}</span>
                  <span className="font-bold" style={{ color: "#D97706" }}>{formatCurrency(a.balanceAmount)} due</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payslips Tab ─────────────────────────────────────────────────────────────

function PayslipsTab({ drawings, bonuses, yearFilter, setYearFilter, availableYears, employeeName, agencyName, agencyAddress, agencyPhone, agencyGstin, profile }: {
  drawings: Drawing[];
  bonuses: Bonus[];
  yearFilter: number;
  setYearFilter: (y: number) => void;
  availableYears: number[];
  employeeName: string;
  agencyName: string;
  agencyAddress: string;
  agencyPhone: string;
  agencyGstin: string;
  profile: SalaryProfile | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (month: number, year: number, entry: { salary: Drawing[]; recoveries: Drawing[] }) => {
    const key = `${month}-${year}`;
    setDownloading(key);
    try {
      const grossPaid = entry.salary.reduce((s, d) => s + d.amount, 0);
      const recovered = entry.recoveries.reduce((s, d) => s + d.amount, 0);
      const monthBonuses = bonuses.filter((b) => b.month === month && b.year === year);
      const bonusAmount = monthBonuses.reduce((s, b) => s + b.amount, 0);
      const payDate = entry.salary[0] ? formatDate(entry.salary[0].date) : `${month}/${year}`;
      const remarks: string[] = [];
      entry.salary.forEach((d) => { if (d.remarks) remarks.push(d.remarks); });
      entry.recoveries.forEach((d) => { if (d.remarks) remarks.push(d.remarks); });
      monthBonuses.forEach((b) => { if (b.reason) remarks.push(`Bonus: ${b.reason}`); });
      await generateSalarySlipPDF({
        agencyName, agencyAddress, agencyPhone, agencyGstin,
        employeeName,
        month, year,
        payDate,
        basicSalary: profile?.monthlySalary ?? grossPaid,
        bonusAmount,
        advanceRecovery: recovered,
        remarks,
      });
    } finally {
      setDownloading(null);
    }
  };

  // Group drawings by month-year for the selected year
  const salaryDrawings = drawings.filter((d) =>
    d.year === yearFilter && (d.type === "SALARY" || d.type === "DRAWING")
  ).sort((a, b) => b.month - a.month);

  const advanceRecoveries = drawings.filter((d) =>
    d.year === yearFilter && d.type === "ADVANCE_RECOVERY"
  );

  // Build monthly payslip entries
  const monthlyMap: Record<number, { salary: Drawing[]; recoveries: Drawing[] }> = {};
  salaryDrawings.forEach((d) => {
    if (!monthlyMap[d.month]) monthlyMap[d.month] = { salary: [], recoveries: [] };
    monthlyMap[d.month].salary.push(d);
  });
  advanceRecoveries.forEach((d) => {
    if (!monthlyMap[d.month]) monthlyMap[d.month] = { salary: [], recoveries: [] };
    monthlyMap[d.month].recoveries.push(d);
  });

  const months = Object.keys(monthlyMap).map(Number).sort((a, b) => b - a);

  const ytdTotal = salaryDrawings.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      {/* Year filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <p className="text-[13px] font-medium mr-1" style={{ color: "#52525B" }}>Year:</p>
        {availableYears.map((y) => (
          <button key={y} onClick={() => setYearFilter(y)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
            style={yearFilter === y
              ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
              : { background: "#fff", color: "#52525B", border: "1px solid #E4E4E7" }}>
            {y}
          </button>
        ))}
        <div className="ml-auto px-3 py-1.5 rounded-lg text-[12px]"
          style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#16A34A" }}>
          Total paid {yearFilter}: <strong>{formatCurrency(ytdTotal)}</strong>
        </div>
      </div>

      {/* Payslip cards */}
      {months.length === 0 ? (
        <div className="py-16 text-center rounded-xl"
          style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
          <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No salary records for {yearFilter}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const entry = monthlyMap[month];
            const grossPaid = entry.salary.reduce((s, d) => s + d.amount, 0);
            const recovered = entry.recoveries.reduce((s, d) => s + d.amount, 0);
            const netReceived = grossPaid - recovered;
            const key = `${month}-${yearFilter}`;
            const isOpen = expanded === key;

            const isDownloading = downloading === key;
            return (
              <div key={key} className="rounded-xl overflow-hidden"
                style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div className="w-full flex items-center justify-between px-5 py-4">
                  <button onClick={() => setExpanded(isOpen ? null : key)}
                    className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px]"
                      style={{ background: "#EFF6FF", color: "#2563EB" }}>
                      {MONTHS[month - 1]}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>
                        {MONTHS[month - 1]} {yearFilter}
                      </p>
                      {entry.salary[0] && (
                        <p className="text-[12px]" style={{ color: "#A1A1AA" }}>
                          Paid on {formatDate(entry.salary[0].date)}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    {recovered > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-[11px]" style={{ color: "#A1A1AA" }}>Adv. Recovery</p>
                        <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>−{formatCurrency(recovered)}</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[11px]" style={{ color: "#A1A1AA" }}>Net Received</p>
                      <p className="text-[16px] font-bold" style={{ color: "#16A34A" }}>{formatCurrency(netReceived)}</p>
                    </div>
                    {/* Download Salary Slip button */}
                    <button
                      onClick={() => handleDownload(month, yearFilter, entry)}
                      disabled={isDownloading}
                      title="Download Salary Slip PDF"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: isDownloading ? "#DBEAFE" : "#2563EB",
                        color: "#fff",
                        border: "none",
                        cursor: isDownloading ? "not-allowed" : "pointer",
                        minWidth: 120,
                        justifyContent: "center",
                      }}
                    >
                      {isDownloading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                        : <><Download className="w-3.5 h-3.5" /> Salary Slip</>}
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : key)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4" style={{ color: "#A1A1AA" }} />
                        : <ChevronDown className="w-4 h-4" style={{ color: "#A1A1AA" }} />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4 border-t" style={{ borderColor: "#F4F4F5" }}>
                    <div className="mt-3 rounded-lg overflow-hidden"
                      style={{ border: "1px solid #E4E4E7" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E4E7" }}>
                            {["Description", "Date", "Amount"].map((h) => (
                              <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entry.salary.map((d) => (
                            <tr key={d.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                              <td style={{ padding: "10px 14px", fontSize: 13, color: "#18181B" }}>
                                {d.type === "SALARY" ? "Salary Payment" : "Drawing"}
                                {d.remarks && <span style={{ color: "#A1A1AA", fontSize: 11, display: "block" }}>{d.remarks}</span>}
                              </td>
                              <td style={{ padding: "10px 14px", fontSize: 12, color: "#71717A" }}>{formatDate(d.date)}</td>
                              <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          {entry.recoveries.map((d) => (
                            <tr key={d.id} style={{ borderBottom: "1px solid #F4F4F5", background: "#FEF2F2" }}>
                              <td style={{ padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>
                                Advance Recovery
                                {d.remarks && <span style={{ color: "#A1A1AA", fontSize: 11, display: "block" }}>{d.remarks}</span>}
                              </td>
                              <td style={{ padding: "10px 14px", fontSize: 12, color: "#71717A" }}>{formatDate(d.date)}</td>
                              <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>−{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#F0FDF4" }}>
                            <td colSpan={2} style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#16A34A" }}>Net Received</td>
                            <td style={{ padding: "10px 14px", fontSize: 15, fontWeight: 800, color: "#16A34A" }}>{formatCurrency(netReceived)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Advances Tab ─────────────────────────────────────────────────────────────

function AdvancesTab({ advances, pendingBalance }: {
  advances: Advance[];
  pendingBalance: number;
}) {
  const totalAdvanced  = advances.reduce((s, a) => s + a.amount, 0);
  const totalRecovered = advances.reduce((s, a) => s + a.recoveredAmount, 0);

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Borrowed",     val: formatCurrency(totalAdvanced),  color: "#DC2626", bg: "#FEF2F2" },
          { label: "Total Recovered",    val: formatCurrency(totalRecovered), color: "#16A34A", bg: "#F0FDF4" },
          { label: "Outstanding Balance",val: formatCurrency(pendingBalance),  color: pendingBalance > 0 ? "#D97706" : "#16A34A", bg: pendingBalance > 0 ? "#FFFBEB" : "#F0FDF4" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center"
            style={{ background: bg, border: `1px solid ${color}22` }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "#71717A" }}>{label}</p>
            <p className="text-[20px] font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {advances.length === 0 ? (
        <div className="py-16 text-center rounded-xl"
          style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <CreditCard className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
          <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No advance records found</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E4E7" }}>
                  {["Date", "Reason", "Amount", "Recovered", "Balance", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advances.sort((a, b) => new Date(b.advanceDate).getTime() - new Date(a.advanceDate).getTime()).map((a) => {
                  const s = ADVANCE_STATUS[a.status] ?? { label: a.status, color: "#52525B", bg: "#F4F4F5" };
                  const progress = a.amount > 0 ? (a.recoveredAmount / a.amount) * 100 : 0;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#71717A" }}>
                        {formatDate(a.advanceDate)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#18181B" }}>
                        {a.reason ?? "—"}
                        {a.notes && <span style={{ display: "block", fontSize: 11, color: "#A1A1AA" }}>{a.notes}</span>}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>
                        {formatCurrency(a.amount)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#16A34A" }}>{formatCurrency(a.recoveredAmount)}</p>
                        {/* Progress bar */}
                        <div style={{ height: 3, background: "#E4E4E7", borderRadius: 4, marginTop: 4, width: 80 }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: "#16A34A", borderRadius: 4 }} />
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: a.balanceAmount > 0 ? "#D97706" : "#16A34A" }}>
                        {a.balanceAmount > 0 ? formatCurrency(a.balanceAmount) : "Nil"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, fontWeight: 600, background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bonuses Tab ──────────────────────────────────────────────────────────────

function BonusesTab({ bonuses, ytdBonus, currentYear }: {
  bonuses: Bonus[];
  ytdBonus: number;
  currentYear: number;
}) {
  const totalAllTime = bonuses.reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: `YTD ${currentYear}`,    val: formatCurrency(ytdBonus),    color: "#D97706", bg: "#FFFBEB" },
          { label: "All Time Total",         val: formatCurrency(totalAllTime), color: "#7C3AED", bg: "#F5F3FF" },
          { label: "Total Bonuses",          val: bonuses.length,               color: "#16A34A", bg: "#F0FDF4" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center"
            style={{ background: bg, border: `1px solid ${color}22` }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "#71717A" }}>{label}</p>
            <p className="text-[20px] font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {bonuses.length === 0 ? (
        <div className="py-16 text-center rounded-xl"
          style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <Gift className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
          <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No bonuses on record yet</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E4E4E7" }}>
                  {["Date", "Month", "Reason", "Remarks", "Amount"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bonuses.sort((a, b) => new Date(b.bonusDate).getTime() - new Date(a.bonusDate).getTime()).map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#71717A" }}>{formatDate(b.bonusDate)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#18181B" }}>
                      {MONTHS[(b.month ?? 1) - 1]} {b.year}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#18181B" }}>{b.reason ?? "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#71717A" }}>{b.remarks ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#D97706",
                        background: "#FFFBEB", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                        {formatCurrency(b.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── My Requests Tab (Employee Request Workflow) ──────────────────────────

function MyRequestsTab({
  initialRequests,
  employeeId
}: {
  initialRequests: SalaryPaymentRequest[];
  employeeId: string;
}) {
  const [requestsList, setRequestsList] = useState<SalaryPaymentRequest[]>(initialRequests);
  const [reqType, setReqType] = useState<"ADVANCE" | "BONUS" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pendingCount = requestsList.filter(r => r.status === "PENDING" || r.status === "MANAGER_APPROVED").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqType) return;
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason/remarks");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const fd = new FormData();
      fd.append("type", reqType);
      fd.append("employeeId", employeeId);
      fd.append("amount", String(numAmt));
      fd.append("remarks", remarks || reason);

      if (reqType === "ADVANCE") {
        fd.append("advanceDate", advanceDate);
        fd.append("reason", reason);
      } else {
        fd.append("bonusDate", new Date().toISOString());
        fd.append("reason", reason);
        fd.append("month", String(month));
        fd.append("year", String(year));
      }

      const res = await createSalaryRequest(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.request) {
        setSuccess(true);
        // Reset form
        setAmount("");
        setReason("");
        setRemarks("");
        setReqType(null);
        // Add new request to list
        setRequestsList([res.request as unknown as SalaryPaymentRequest, ...requestsList]);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "PENDING":
        return { label: "⏳ Pending Manager Approval", color: "#D97706", bg: "#FFFBEB" };
      case "MANAGER_APPROVED":
        return { label: "⏳ Manager Approved (Pending Admin)", color: "#2563EB", bg: "#EFF6FF" };
      case "APPROVED":
        return { label: "✓ Approved & Paid", color: "#059669", bg: "#ECFDF5" };
      case "REJECTED":
        return { label: "✗ Rejected", color: "#DC2626", bg: "#FEF2F2" };
      default:
        return { label: status, color: "#71717A", bg: "#F4F4F5" };
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Request Submission Form */}
      <div className="lg:col-span-1 space-y-4">
        <div className="rounded-xl p-5"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <h3 className="text-[14px] font-bold mb-4" style={{ color: "#18181B" }}>New Request</h3>

          {pendingCount > 0 && (
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg mb-4 text-[12px]"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>You have {pendingCount} pending request(s) awaiting approval.</span>
            </div>
          )}

          {!reqType ? (
            <div className="space-y-2.5">
              <button
                onClick={() => { setReqType("ADVANCE"); setError(null); setSuccess(false); }}
                className="w-full flex items-center justify-between p-4 rounded-xl text-left border hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
                style={{ borderColor: "#E4E4E7" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Request Advance (Udhari)</p>
                    <p className="text-[11px]" style={{ color: "#71717A" }}>Borrow salary in advance</p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>

              <button
                onClick={() => { setReqType("BONUS"); setError(null); setSuccess(false); }}
                className="w-full flex items-center justify-between p-4 rounded-xl text-left border hover:border-purple-500 hover:bg-purple-50/30 transition-all group"
                style={{ borderColor: "#E4E4E7" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Request Bonus</p>
                    <p className="text-[11px]" style={{ color: "#71717A" }}>Special bonus request</p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: "#F4F4F5" }}>
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: reqType === "ADVANCE" ? "#DC2626" : "#7C3AED" }}>
                  {reqType === "ADVANCE" ? "💰 Requesting Advance" : "🎁 Requesting Bonus"}
                </span>
                <button
                  type="button"
                  onClick={() => setReqType(null)}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg text-[12px]" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626" }}>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Requested Amount (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-slate-400"
                  style={{ borderColor: "#E4E4E7" }}
                  required
                />
              </div>

              {reqType === "ADVANCE" ? (
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Expected Date *</label>
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-slate-400"
                    style={{ borderColor: "#E4E4E7" }}
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Month *</label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none"
                      style={{ borderColor: "#E4E4E7" }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Year *</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none"
                      style={{ borderColor: "#E4E4E7" }}
                    >
                      {[new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Reason / Explanation *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you are raising this request..."
                  rows={3}
                  className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none resize-none"
                  style={{ borderColor: "#E4E4E7" }}
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional remarks"
                  className="w-full px-3.5 py-2 border rounded-lg text-[13px] outline-none"
                  style={{ borderColor: "#E4E4E7" }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: reqType === "ADVANCE" ? "#DC2626" : "#7C3AED",
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer"
                }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Request
              </button>
            </form>
          )}

          {success && (
            <div className="mt-4 p-3.5 rounded-xl text-center text-[13px] font-medium"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" }}>
              <Check className="w-5 h-5 mx-auto mb-1 text-emerald-600 bg-emerald-100 rounded-full p-0.5" />
              Request submitted successfully!
            </div>
          )}
        </div>
      </div>

      {/* Right: Requests List & Pipeline */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl p-5"
          style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <h3 className="text-[14px] font-bold mb-4" style={{ color: "#18181B" }}>Request History & Approval Pipeline</h3>

          {requestsList.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="text-[13px]" style={{ color: "#71717A" }}>No requests submitted yet.</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>Any bonus or advance requests you submit will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requestsList.map((req) => {
                const statusMeta = getStatusDetails(req.status);
                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border transition-all"
                    style={{ borderColor: "#E4E4E7", background: "#FCFDFD" }}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold`}
                            style={{
                              background: req.type === "ADVANCE" ? "#FEF2F2" : "#F5F3FF",
                              color: req.type === "ADVANCE" ? "#DC2626" : "#7C3AED"
                            }}>
                            {req.type}
                          </span>
                          <span className="text-[14px] font-bold" style={{ color: "#18181B" }}>
                            {formatCurrency(req.amount)}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
                          Submitted: {formatDate(req.createdAt)}
                        </p>
                      </div>

                      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
                        style={{ background: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="text-[13px] mb-4 space-y-1.5 p-3 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                      <p style={{ color: "#334155" }}>
                        <strong>Reason:</strong> {req.remarks || "No reason specified"}
                      </p>
                      {req.type === "BONUS" && req.month && req.year && (
                        <p className="text-[12px]" style={{ color: "#64748B" }}>
                          <strong>Period:</strong> {new Date(2000, req.month - 1).toLocaleString('default', { month: 'short' })} {req.year}
                        </p>
                      )}
                    </div>

                    {/* Visual 3-Step Approval Pipeline */}
                    <div className="border-t pt-4 mt-3" style={{ borderColor: "#F1F5F9" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#64748B" }}>Approval Pipeline</p>

                      <div className="grid grid-cols-3 gap-2 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-3.5 left-6 right-6 h-[2px] bg-slate-200 z-0 font-sans"></div>

                        {/* Step 1: Submitted */}
                        <div className="flex flex-col items-center text-center z-10">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 border-2 border-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <span className="text-[10px] font-bold mt-1.5" style={{ color: "#059669" }}>Submitted</span>
                          <span className="text-[9px]" style={{ color: "#94A3B8" }}>by you</span>
                        </div>

                        {/* Step 2: Manager Review */}
                        <div className="flex flex-col items-center text-center z-10">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white ${
                            req.status === "REJECTED" && !req.reviewedBy && req.managerReviewedBy
                              ? "bg-red-100 text-red-600"
                              : req.status === "MANAGER_APPROVED" || req.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-amber-100 text-amber-600"
                          }`}>
                            {req.status === "REJECTED" && !req.reviewedBy && req.managerReviewedBy ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : req.status === "MANAGER_APPROVED" || req.status === "APPROVED" ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold mt-1.5" style={{
                            color: req.status === "REJECTED" && !req.reviewedBy && req.managerReviewedBy
                              ? "#DC2626"
                              : req.status === "MANAGER_APPROVED" || req.status === "APPROVED"
                                ? "#059669"
                                : "#D97706"
                          }}>Manager Approval</span>
                          <span className="text-[9px] truncate max-w-[90px]" style={{ color: "#94A3B8" }}>
                            {req.managerReviewedBy?.name || "Awaiting Review"}
                          </span>
                        </div>

                        {/* Step 3: Admin Approval */}
                        <div className="flex flex-col items-center text-center z-10">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white ${
                            req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-600"
                              : req.status === "REJECTED" && req.reviewedBy
                                ? "bg-red-100 text-red-600"
                                : "bg-slate-100 text-slate-400"
                          }`}>
                            {req.status === "APPROVED" ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : req.status === "REJECTED" && req.reviewedBy ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold mt-1.5" style={{
                            color: req.status === "APPROVED"
                              ? "#059669"
                              : req.status === "REJECTED" && req.reviewedBy
                                ? "#DC2626"
                                : "#64748B"
                          }}>Admin Approval</span>
                          <span className="text-[9px] truncate max-w-[90px]" style={{ color: "#94A3B8" }}>
                            {req.reviewedBy?.name || "Awaiting Review"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Notes Callouts */}
                    {req.managerReviewNote && (
                      <div className="mt-3 p-2.5 rounded-lg text-[12px] border"
                        style={{
                          background: req.status === "REJECTED" ? "#FEF2F2" : "#F8FAFC",
                          borderColor: req.status === "REJECTED" ? "#FEE2E2" : "#E2E8F0",
                          color: req.status === "REJECTED" ? "#991B1B" : "#475569"
                        }}>
                        <strong>Manager Note:</strong> {req.managerReviewNote}
                      </div>
                    )}
                    {req.reviewNote && (
                      <div className="mt-2 p-2.5 rounded-lg text-[12px] border"
                        style={{
                          background: req.status === "REJECTED" ? "#FEF2F2" : "#F0FDF4",
                          borderColor: req.status === "REJECTED" ? "#FEE2E2" : "#DCFCE7",
                          color: req.status === "REJECTED" ? "#991B1B" : "#166534"
                        }}>
                        <strong>Admin Note:</strong> {req.reviewNote}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
