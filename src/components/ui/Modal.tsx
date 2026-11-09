"use client";

import { X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
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
  isOpen,
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
  const isModalOpen = open ?? isOpen ?? false;
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!isModalOpen || !isMounted) return;

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
  }, [isModalOpen, onClose, isMounted]);

  if (!isModalOpen || !isMounted) return null;

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
        className={`relative w-full flex flex-col animate-fade-up rounded-t-2xl sm:rounded-2xl border overflow-hidden shadow-2xl bg-[var(--color-surface)] dark:bg-zinc-900 pb-[env(safe-area-inset-bottom)] sm:pb-0 ${className || ""}`}
        style={{
          maxWidth: widths[size],
          maxHeight: "calc(100dvh - 1rem)",
          borderColor: "var(--color-border)",
          boxShadow:
            "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.04)",
          ...style,
        }}
      >
        {/* ── Sticky Header ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 flex-shrink-0 bg-[var(--color-surface)] dark:bg-zinc-900"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <h2
              className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12px] mt-0.5 text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0 bg-[var(--color-surface)] dark:bg-zinc-900"
          style={{ scrollbarWidth: "thin" }}
        >
          {children}
        </div>

        {/* ── Sticky Footer (only rendered if footer prop is passed) ───────── */}
        {footer && (
          <div
            className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 sm:py-4 flex-shrink-0 bg-[var(--color-surface)] dark:bg-zinc-900 ${centerFooter ? "justify-center" : "justify-end"}`}
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
