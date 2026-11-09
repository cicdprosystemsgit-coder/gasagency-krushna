"use client";

import { useState } from "react";
import {
  Boxes,
  Truck,
  ReceiptText,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Fuel,
  Smartphone,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function InteractiveLandingCockpit() {
  const [activeTab, setActiveTab] = useState<"godown" | "dispatch" | "ledger" | "audit">("godown");

  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl shadow-zinc-200/50 dark:shadow-black/60 overflow-hidden transition-all">
      {/* Top Cockpit Bar */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-zinc-400 font-mono text-[11px] ml-2 hidden sm:inline">
            ops.gasagency.app/live-cockpit
          </span>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE AGENCY SYNC
          </span>
          <span className="text-zinc-400 hidden md:inline">Shift: Morning (07:30 - 16:30)</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 px-3 sm:px-4 pt-2.5 flex items-center gap-1 overflow-x-auto touch-scroll-x scrollbar-none overscroll-x-contain">
        {[
          { id: "godown", label: "Godown & Cylinder Inventory", icon: Boxes, badge: "2,480 units" },
          { id: "dispatch", label: "Live Delivery Runs & OTP", icon: Truck, badge: "8 Vehicles Active" },
          { id: "ledger", label: "Commercial Credit (Udhari)", icon: ReceiptText, badge: "₹1,42,850 Due" },
          { id: "audit", label: "4-Level Approval Chain", icon: ShieldCheck, badge: "100% Reconciled" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`hidden lg:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900"
                    : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cockpit Content View */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-950 min-h-[380px]">
        {/* TAB 1: GODOWN INVENTORY */}
        {activeTab === "godown" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* KPI metric tiles with tabular figures */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "14.2kg Domestic (Full)",
                  val: "1,240",
                  sub: "+450 from BPCL plant",
                  color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",
                },
                {
                  label: "14.2kg Empties in Yard",
                  val: "382",
                  sub: "Ready for Plant Return",
                  color: "text-amber-600 dark:text-amber-400",
                  bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
                },
                {
                  label: "19kg Commercial Jumbo",
                  val: "418",
                  sub: "Hotel batch stock",
                  color: "text-emerald-600 dark:text-emerald-400",
                  bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
                },
                {
                  label: "Defective / SV Valve Quarantined",
                  val: "14",
                  sub: "Flagged with Serial #",
                  color: "text-rose-600 dark:text-rose-400",
                  bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40",
                },
              ].map((k) => (
                <div key={k.label} className={`p-3.5 rounded-xl border ${k.bg}`}>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{k.label}</p>
                  <p className={`text-2xl font-bold font-mono tracking-tight mt-1 ${k.color}`}>{k.val}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    {k.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Live Godown Gate Log */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                    Live Godown Vehicle Gate Registry
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">Trucks Checked Today: 5</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {[
                  {
                    truck: "GJ-06-AX-8912",
                    driver: "Baldev Singh",
                    type: "Plant Delivery (Inbound)",
                    in: "450 Full",
                    out: "450 Empty",
                    time: "10:14 AM",
                    status: "Verified & Stocked",
                  },
                  {
                    truck: "GJ-06-BT-4421",
                    driver: "Ramesh Solanki",
                    type: "Sub-Depot Transfer",
                    in: "120 Empty",
                    out: "120 Full",
                    time: "09:28 AM",
                    status: "Verified & Stocked",
                  },
                ].map((row, idx) => (
                  <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-[11px] text-zinc-700 dark:text-zinc-300">
                        TRK
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{row.truck}</span>
                          <span className="text-zinc-400">•</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{row.driver}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">{row.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="font-mono text-[11px]">
                        <span className="text-emerald-600 font-semibold">{row.in}</span>
                        <span className="text-zinc-400 mx-1">/</span>
                        <span className="text-amber-600 font-semibold">{row.out}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE DISPATCH */}
        {activeTab === "dispatch" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { boy: "Vikram Sharma", vehicle: "E-Rickshaw 04", area: "Sector 14 to 22", progress: "38 / 42 Delivered", cash: "₹34,580", online: "₹8,240" },
                { boy: "Mahesh Verma", vehicle: "Tempo RJ-14", area: "Industrial Zone & Hotels", progress: "24 / 25 Delivered", cash: "₹52,800", online: "₹14,000" },
                { boy: "Sunil Rawat", vehicle: "Three-Wheeler 02", area: "Old City Market", progress: "40 / 40 Delivered", cash: "₹38,200", online: "₹6,150" },
              ].map((v) => (
                <div key={v.boy} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      {v.boy}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {v.vehicle}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    {v.area}
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Run Progress</span>
                      <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{v.progress}</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: "90%" }} />
                    </div>
                    <div className="pt-2 flex justify-between font-mono text-[11px] border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Cash: <strong className="text-zinc-900 dark:text-zinc-100">{v.cash}</strong></span>
                      <span className="text-zinc-500">UPI: <strong className="text-emerald-600">{v.online}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                    Mandatory Consumer OTP & Leakage Test Guarantee
                  </p>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300">
                    Delivery cannot be closed without entering the 4-digit DAC / OTP code received on consumer SMS.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block font-mono text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                100% Safe Delivery
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: COMMERCIAL CREDIT LEDGER (UDHARI) */}
        {activeTab === "ledger" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Commercial Accounts Outstanding Ledger (Udhari Khata)
                </span>
                <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-bold">
                  Total Outstanding: ₹1,42,850
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {[
                  {
                    client: "Grand Heritage Palace & Hotel",
                    cylinders: "12 × 19kg Commercial",
                    balance: "₹48,600",
                    dueDays: "12 days overdue",
                    status: "Warning Sent",
                    statusColor: "text-amber-700 bg-amber-50 border-amber-200",
                  },
                  {
                    client: "Shree Ganesh Sweets & Caterers",
                    cylinders: "8 × 19kg Commercial",
                    balance: "₹32,400",
                    dueDays: "Due Tomorrow",
                    status: "Payment Link Sent",
                    statusColor: "text-blue-700 bg-blue-50 border-blue-200",
                  },
                  {
                    client: "Highway King Dhaba & Restaurant",
                    cylinders: "15 × 19kg Commercial",
                    balance: "₹61,850",
                    dueDays: "Payment Cleared (NEFT)",
                    status: "Reconciled",
                    statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                  },
                ].map((row, idx) => (
                  <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{row.cylinders}</p>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <p className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">{row.balance}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{row.dueDays}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
              ⚡ Automated WhatsApp ledger statements with UPI intent paylinks are automatically sent on the 1st & 15th of every month.
            </p>
          </div>
        )}

        {/* TAB 4: 4-LEVEL APPROVAL */}
        {activeTab === "audit" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  The Four-Stage Immutability Pipeline
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Audit Protocol: Active
                </span>
              </div>

              {/* Steps timeline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                {[
                  {
                    step: "01",
                    title: "Field Employee",
                    desc: "Drivers & Godown log individual cylinder counts & physical cash collected.",
                    badge: "Logged 17:00",
                    status: "Completed",
                  },
                  {
                    step: "02",
                    title: "Counter Staff",
                    desc: "Matches physical cash in locker with delivery slips and offline sales counter.",
                    badge: "Matched 17:35",
                    status: "Completed",
                  },
                  {
                    step: "03",
                    title: "Operations Manager",
                    desc: "Validates plant delivery invoices against godown physical gate inward pass.",
                    badge: "Verified 18:05",
                    status: "Completed",
                  },
                  {
                    step: "04",
                    title: "Distributor / Admin",
                    desc: "Digital sign-off permanently writes records to database ledger and locks edit access.",
                    badge: "Locked 18:15",
                    status: "Final Lock",
                  },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">STAGE {s.step}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">{s.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">{s.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">{s.badge}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 text-zinc-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Zero unverified entries ever touch your financial accounts or statutory tax records.
              </span>
              <span className="font-mono text-[11px] text-zinc-400 hidden sm:inline">SHA-256 Audit Seal</span>
            </div>
          </div>
        )}
      </div>

      {/* Cockpit Footer Summary */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Database: PostgreSQL + Prisma
          </span>
          <span className="hidden md:inline text-zinc-400">•</span>
          <span className="hidden md:inline">Multi-branch Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Click any tab above to inspect operations</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}

