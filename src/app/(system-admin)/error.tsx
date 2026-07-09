"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ServerCrash, ShieldAlert, RefreshCw, Home, Flame } from "lucide-react";

export default function SystemAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SystemAdminError]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0f172a", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Navbar */}
      <nav
        className="w-full flex items-center justify-between px-6 md:px-10"
        style={{ height: 56, background: "#1e293b", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 40 }}
      >
        <Link href="/system-admin" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#6366f1" }}>
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-slate-100">GasAgency Admin Console</span>
        </Link>
        <Link
          href="/system-admin"
          className="flex items-center gap-1.5 text-[13px] font-medium transition-all px-4 py-1.5 rounded-lg"
          style={{ color: "#6366f1", border: "1px solid #4338ca", background: "#312e81" }}
        >
          <Home className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)", border: "1px solid #f87171" }}
            >
              <ServerCrash className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-2xl animate-ping" style={{ background: "rgba(239,68,68,0.15)", animationDuration: "3s" }} />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8 mb-6" style={{ background: "#1e293b", border: "1px solid #334155", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.3)" }}>
            <div className="flex justify-center mb-4">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: "#7f1d1d", color: "#fca5a5", border: "1px solid #b91c1c" }}
              >
                <ShieldAlert className="w-3 h-3" /> Console Crash
              </span>
            </div>

            <h1 className="text-[26px] font-bold text-center text-slate-100 tracking-tight mb-3">
              Console runtime error
            </h1>
            <p className="text-[14px] text-center leading-relaxed mb-8" style={{ color: "#94a3b8" }}>
              An error occurred in the system administration section. The underlying server log contains details. Try reloading this console section.
            </p>

            {error.digest && (
              <div className="rounded-lg px-4 py-2 mb-6 text-center" style={{ background: "#0f172a", border: "1px solid #334155" }}>
                <span className="text-[11px] font-mono" style={{ color: "#64748b" }}>Error Digest: {error.digest}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all hover:brightness-95 active:scale-[0.98]"
                style={{ background: "#6366f1", color: "#ffffff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
              >
                <RefreshCw className="w-4 h-4" /> Retry console
              </button>
              <Link
                href="/system-admin"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[14px] transition-all hover:bg-slate-800 active:scale-[0.98]"
                style={{ background: "#334155", color: "#f1f5f9", border: "1px solid #475569" }}
              >
                <Home className="w-4 h-4" /> Go to Console
              </Link>
            </div>
          </div>

          <p className="text-center mt-6 text-[11px]" style={{ color: "#64748b" }}>
            © 2026 GasAgency Enterprise Console · System Administrator Mode
          </p>
        </div>
      </div>
    </div>
  );
}
