"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  centerFooter?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const widths = { sm: 400, md: 520, lg: 640, xl: 820 };

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  centerFooter = false,
  className,
  style,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Dialog — flex column so header + footer never scroll, only body does */}
      <div
        className={`relative w-full flex flex-col animate-fade-up rounded-t-2xl sm:rounded-2xl border overflow-hidden shadow-2xl bg-white ${className || ""}`}
        style={{
          maxWidth: widths[size],
          maxHeight: "calc(100vh - 2rem)",
          borderColor: "var(--color-border)",
          boxShadow:
            "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.04)",
          ...style,
        }}
      >
        {/* ── Sticky Header ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <h2
              className="text-[15px] font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <div
          className="px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-white"
          style={{ scrollbarWidth: "thin" }}
        >
          {children}
        </div>

        {/* ── Sticky Footer (only rendered if footer prop is passed) ───────── */}
        {footer && (
          <div
            className={`flex items-center gap-2 px-6 py-4 flex-shrink-0 bg-white ${centerFooter ? "justify-center" : "justify-end"}`}
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
