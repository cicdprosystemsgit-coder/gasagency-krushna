"use client";

import { useState } from "react";
import {
  Wallet, TrendingUp, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Calendar, Gift, CreditCard, Info,
  Banknote, Download, Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateSalarySlipPDF } from "@/lib/generateSalarySlipPDF";

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

export interface MySalaryClientProps {
  profile: SalaryProfile | null;
  drawings: Drawing[];
  advances: Advance[];
  bonuses: Bonus[];
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

const TABS = ["Overview", "Payslips", "Advances", "Bonuses"] as const;
type Tab = typeof TABS[number];

// ─── Component ────────────────────────────────────────────────────────────────

export function MySalaryClient({ profile, drawings, advances, bonuses, employeeName, agencyName = "", agencyAddress = "", agencyPhone = "", agencyGstin = "" }: MySalaryClientProps) {
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
