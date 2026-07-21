"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  Hash,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RegulatorRecordItem {
  id: string;
  regulatorNo: string;
  status: string;
  issuedAt: Date | string;
  notes: string | null;
  createdAt: Date | string;
  customer: {
    id: string;
    name: string;
    phone: string;
    customerCode: string | null;
    type: string;
  };
  officeTransaction?: {
    id: string;
    date: Date | string;
    amount: number;
    paymentMode: string;
    type: string;
    addedBy: { name: string };
  } | null;
  replacedBy?: {
    id: string;
    regulatorNo: string;
    issuedAt: Date | string;
  } | null;
  replaces?: {
    id: string;
    regulatorNo: string;
    issuedAt: Date | string;
  } | null;
}

interface RegulatorsClientProps {
  records: RegulatorRecordItem[];
}

export function RegulatorsClient({ records }: RegulatorsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ISSUED" | "REPLACED">("ALL");

  const filteredRecords = records.filter((r) => {
    const statusMatch = statusFilter === "ALL" || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const textMatch =
      !q ||
      r.regulatorNo.toLowerCase().includes(q) ||
      r.customer.name.toLowerCase().includes(q) ||
      r.customer.phone.includes(q) ||
      (r.customer.customerCode ?? "").toLowerCase().includes(q);
    return statusMatch && textMatch;
  });

  const totalIssued = records.length;
  const activeRegulators = records.filter((r) => r.status === "ISSUED").length;
  const totalReplaced = records.filter((r) => r.status === "REPLACED").length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            Regulator Ledger & Device Tracking
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Complete audit history of customer regulator issuances, serial numbers, and replacement exchanges.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Regulators Tracked</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalIssued}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Active Regulators (In Use)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeRegulators}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Faulty / Replaced Regulators</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalReplaced}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search serial no, customer name or phone..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          {(["ALL", "ISSUED", "REPLACED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-initial",
                statusFilter === st
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {st === "ALL" ? "All Regulators" : st === "ISSUED" ? "Active (Issued)" : "Replaced (Faulty)"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
                <th className="px-4 py-3.5 text-left font-bold">Serial No.</th>
                <th className="px-4 py-3.5 text-left font-bold">Customer Name</th>
                <th className="px-4 py-3.5 text-left font-bold">Status</th>
                <th className="px-4 py-3.5 text-left font-bold">Issue Date & Time</th>
                <th className="px-4 py-3.5 text-left font-bold">Transaction Charges</th>
                <th className="px-4 py-3.5 text-left font-bold">Replacement History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No regulator records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        #{r.regulatorNo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" /> {r.customer.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium pl-5">
                          {r.customer.phone} {r.customer.customerCode ? `• Conn: ${r.customer.customerCode}` : ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.status === "ISSUED" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Active / In Use
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-indigo-100/80 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          <RefreshCw className="w-3 h-3" /> Replaced / Returned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-700">
                        {formatDate(r.issuedAt)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(r.issuedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.officeTransaction ? (
                        <div>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(r.officeTransaction.amount)}
                          </span>
                          <span className="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                            {r.officeTransaction.paymentMode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.replaces ? (
                        <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg">
                          Replaced Faulty #{r.replaces.regulatorNo}
                        </div>
                      ) : r.replacedBy ? (
                        <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 p-1.5 rounded-lg">
                          Swapped with New #{r.replacedBy.regulatorNo}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">Original First-Time Issue</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
