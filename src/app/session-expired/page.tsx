"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  ShieldOff,
  Clock,
  ArrowRight,
  Home,
  LogIn,
  Flame,
  CheckCircle2,
} from "lucide-react";

// ── Timeline step component ───────────────────────────────────────────────────
function TimelineStep({
  icon,
  title,
  description,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl transition-all"
      style={{
        background: active ? "rgba(37,99,235,0.06)" : "transparent",
        border: active ? "1px solid rgba(37,99,235,0.15)" : "1px solid transparent",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: active ? "#2563eb" : "rgba(37,99,235,0.08)",
        }}
      >
        <span style={{ color: active ? "#fff" : "#2563eb" }}>{icon}</span>
      </div>
      <div>
        <p
          className="text-sm font-semibold leading-none mb-1"
          style={{ color: active ? "#1e3a8a" : "#374151" }}
        >
          {title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Inner page content (uses useSearchParams → needs Suspense boundary) ──────
function SessionExpiredContent() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "inactivity";

  const isInactivity = reason === "inactivity";
  const isManual     = reason === "logout";

  const headline = isInactivity
    ? "Your session has expired"
    : isManual
    ? "You have been signed out"
    : "Session ended";

  const subtext = isInactivity
    ? "For your security, sessions are automatically closed after 6 hours of inactivity. Please sign in again to continue."
    : isManual
    ? "You have successfully signed out of the platform. Sign in again whenever you're ready."
    : "Your session is no longer active. Please sign in to continue.";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Top nav bar ─────────────────────────────────────── */}
      <nav
        className="w-full flex items-center justify-between px-6 md:px-10"
        style={{
          height: 56,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#2563eb" }}
          >
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-zinc-900">GasAgency</span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-1.5 text-[13px] font-medium transition-all px-4 py-1.5 rounded-lg"
          style={{
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
          }}
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign in
        </Link>
      </nav>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Status icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{
                background: isInactivity
                  ? "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)"
                  : "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)",
                border: isInactivity ? "1px solid #fdba74" : "1px solid #7dd3fc",
              }}
            >
              {isInactivity ? (
                <Clock className="w-10 h-10" style={{ color: "#ea580c" }} />
              ) : (
                <CheckCircle2 className="w-10 h-10" style={{ color: "#0284c7" }} />
              )}
              {/* Decorative ring */}
              <div
                className="absolute inset-0 rounded-2xl animate-ping"
                style={{
                  background: isInactivity
                    ? "rgba(234,88,12,0.07)"
                    : "rgba(2,132,199,0.07)",
                  animationDuration: "3s",
                }}
              />
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 mb-6"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 24px -4px rgba(15,23,42,0.08)",
            }}
          >
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{
                  background: isInactivity ? "#fff7ed" : "#f0f9ff",
                  color: isInactivity ? "#c2410c" : "#0369a1",
                  border: isInactivity ? "1px solid #fed7aa" : "1px solid #bae6fd",
                }}
              >
                <ShieldOff className="w-3 h-3" />
                {isInactivity ? "Security — Auto Logout" : "Signed Out"}
              </span>
            </div>

            <h1 className="text-[26px] font-bold text-center text-zinc-900 tracking-tight mb-3">
              {headline}
            </h1>

            <p className="text-[14px] text-center leading-relaxed mb-8" style={{ color: "#64748b" }}>
              {subtext}
            </p>

            {/* What happened — only for inactivity */}
            {isInactivity && (
              <div className="mb-8 space-y-1.5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3 pl-1"
                  style={{ color: "#94a3b8" }}
                >
                  What happened?
                </p>
                <TimelineStep
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  title="You logged in successfully"
                  description="Your 6-hour activity window started when you signed in."
                />
                <TimelineStep
                  icon={<Clock className="w-4 h-4" />}
                  title="No activity detected for 6 hours"
                  description="The system did not detect any page visit or interaction within the 6-hour window."
                  active
                />
                <TimelineStep
                  icon={<ShieldOff className="w-4 h-4" />}
                  title="Session automatically closed"
                  description="Your session was terminated to protect your account and company data."
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all hover:brightness-95 active:scale-[0.98]"
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                }}
              >
                <LogIn className="w-4 h-4" />
                Sign in again
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[14px] transition-all hover:bg-slate-100 active:scale-[0.98]"
                style={{
                  background: "#f1f5f9",
                  color: "#374151",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Home className="w-4 h-4" />
                Back to home
              </Link>
            </div>
          </div>

          {/* Security note */}
          <div
            className="flex items-start gap-3 rounded-xl px-5 py-4"
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
            <div>
              <p className="text-[12px] font-semibold text-green-800 mb-0.5">
                Your data is safe
              </p>
              <p className="text-[12px] text-green-700 leading-relaxed">
                Automatic session expiry protects your account from unauthorized access.
                No data was lost — simply sign in to resume your work.
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-[11px]" style={{ color: "#94a3b8" }}>
            © 2026 GasAgency Enterprise Platform · Sessions expire after 6 hours of inactivity
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page export (wraps in Suspense for useSearchParams) ──────────────────────
export default function SessionExpiredPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#f8fafc" }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SessionExpiredContent />
    </Suspense>
  );
}
