"use client";

import Link from "next/link";
import { Search, LayoutDashboard, ArrowLeft, Flame, Info } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Navbar */}
      <nav
        className="w-full flex items-center justify-between px-6 md:px-10"
        style={{ height: 56, background: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 40 }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#2563eb" }}>
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-zinc-900">GasAgency</span>
        </Link>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-[13px] font-medium transition-all px-4 py-1.5 rounded-lg"
          style={{ color: "#2563eb", border: "1px solid #bfdbfe", background: "#eff6ff" }}
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)", border: "1px solid #7dd3fc" }}
            >
              <Search className="w-10 h-10" style={{ color: "#0284c7" }} />
              <div className="absolute inset-0 rounded-2xl animate-ping" style={{ background: "rgba(2,132,199,0.07)", animationDuration: "3s" }} />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8 mb-6" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px -4px rgba(15,23,42,0.08)" }}>
            <div className="flex justify-center mb-4">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
              >
                <Search className="w-3 h-3" /> Record Not Found
              </span>
            </div>

            <h1 className="text-[26px] font-bold text-center text-zinc-900 tracking-tight mb-3">
              Record not found
            </h1>
            <p className="text-[14px] text-center leading-relaxed mb-8" style={{ color: "#64748b" }}>
              The item you&apos;re looking for doesn&apos;t exist or may have been deleted. It may have been moved or removed by an administrator.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all hover:brightness-95 active:scale-[0.98]"
                style={{ background: "#2563eb", color: "#ffffff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
              >
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </Link>
              <button
                onClick={() => window.history.back()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[14px] transition-all hover:bg-slate-100 active:scale-[0.98]"
                style={{ background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0" }}
              >
                <ArrowLeft className="w-4 h-4" /> Go back
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl px-5 py-4" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#1d4ed8" }} />
            <div>
              <p className="text-[12px] font-semibold text-blue-800 mb-0.5">Tip</p>
              <p className="text-[12px] text-blue-700 leading-relaxed">
                If you believe this record should exist, contact your administrator or check if it was recently archived.
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-[11px]" style={{ color: "#94a3b8" }}>
            © 2026 GasAgency Enterprise Platform · Record Not Found
          </p>
        </div>
      </div>
    </div>
  );
}
