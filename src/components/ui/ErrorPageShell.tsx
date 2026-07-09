"use client";

/**
 * Shared shell used by all error / status pages.
 * Keeps the brand navbar + centered card layout consistent
 * across: not-found, error, unauthorized, maintenance, offline, session-expired.
 */
import Link from "next/link";
import { Flame, LogIn } from "lucide-react";

interface ErrorPageShellProps {
  /** Large icon box at the top */
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  icon: React.ReactNode;
  /** Ping ring colour (rgba) */
  pingColor: string;
  /** Badge pill */
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  badgeIcon: React.ReactNode;
  badgeLabel: string;
  /** Heading + body */
  heading: string;
  body: string;
  /** Slot for extra card content (timeline, error details, etc.) */
  children?: React.ReactNode;
  /** Primary CTA */
  primaryHref?: string;
  primaryLabel: string;
  primaryIcon: React.ReactNode;
  primaryOnClick?: () => void;
  /** Secondary CTA */
  secondaryHref?: string;
  secondaryLabel: string;
  secondaryIcon: React.ReactNode;
  /** Footer info box */
  infoBg: string;
  infoBorder: string;
  infoIcon: React.ReactNode;
  infoIconColor: string;
  infoTitle: string;
  infoBody: string;
  /** Footer copyright line */
  footerNote?: string;
  /** Nav right-side slot */
  navAction?: React.ReactNode;
}

export function ErrorPageShell({
  iconBg, iconBorder, iconColor, icon, pingColor,
  badgeBg, badgeBorder, badgeColor, badgeIcon, badgeLabel,
  heading, body, children,
  primaryHref, primaryLabel, primaryIcon, primaryOnClick,
  secondaryHref, secondaryLabel, secondaryIcon,
  infoBg, infoBorder, infoIcon, infoIconColor, infoTitle, infoBody,
  footerNote,
  navAction,
}: ErrorPageShellProps) {
  const PrimaryEl = primaryHref ? Link : "button";
  const SecondaryEl = secondaryHref ? Link : "button";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Navbar ── */}
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

        {navAction ?? (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[13px] font-medium transition-all px-4 py-1.5 rounded-lg"
            style={{ color: "#2563eb", border: "1px solid #bfdbfe", background: "#eff6ff" }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Link>
        )}
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Status icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{ background: iconBg, border: iconBorder }}
            >
              <span style={{ color: iconColor }}>{icon}</span>
              <div
                className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: pingColor, animationDuration: "3s" }}
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
                style={{ background: badgeBg, color: badgeColor, border: badgeBorder }}
              >
                {badgeIcon}
                {badgeLabel}
              </span>
            </div>

            <h1 className="text-[26px] font-bold text-center text-zinc-900 tracking-tight mb-3">
              {heading}
            </h1>
            <p className="text-[14px] text-center leading-relaxed mb-8" style={{ color: "#64748b" }}>
              {body}
            </p>

            {children}

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* @ts-expect-error – polymorphic as/href */}
              <PrimaryEl
                {...(primaryHref ? { href: primaryHref } : { onClick: primaryOnClick, type: "button" })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all hover:brightness-95 active:scale-[0.98]"
                style={{ background: "#2563eb", color: "#ffffff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
              >
                {primaryIcon}
                {primaryLabel}
              </PrimaryEl>

              {/* @ts-expect-error – polymorphic as/href */}
              <SecondaryEl
                {...(secondaryHref ? { href: secondaryHref } : { type: "button" })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[14px] transition-all hover:bg-slate-100 active:scale-[0.98]"
                style={{ background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0" }}
              >
                {secondaryIcon}
                {secondaryLabel}
              </SecondaryEl>
            </div>
          </div>

          {/* Info footer box */}
          <div
            className="flex items-start gap-3 rounded-xl px-5 py-4"
            style={{ background: infoBg, border: infoBorder }}
          >
            <span className="mt-0.5 flex-shrink-0" style={{ color: infoIconColor }}>{infoIcon}</span>
            <div>
              <p className="text-[12px] font-semibold mb-0.5" style={{ color: infoIconColor }}>{infoTitle}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: infoIconColor, opacity: 0.85 }}>{infoBody}</p>
            </div>
          </div>

          {footerNote && (
            <p className="text-center mt-6 text-[11px]" style={{ color: "#94a3b8" }}>
              {footerNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
