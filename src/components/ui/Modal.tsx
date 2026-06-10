"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const widths = { sm: 400, md: 480, lg: 600, xl: 780 };

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    
    // Prevent background scroll
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Premium Backdrop with Blur */}
      <div
        className="absolute inset-0 transition-opacity duration-300 ease-out animate-fade-in"
        style={{ 
          background: "rgba(15, 23, 42, 0.3)", 
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)"
        }}
        onClick={onClose}
      />

      {/* Premium Dialog Container */}
      <div
        className="relative w-full flex flex-col animate-fade-up rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          maxWidth: widths[size],
          maxHeight: "calc(100vh - 4rem)",
          background: "#FFFFFF",
          borderColor: "var(--color-border)",
          boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.03)",
        }}
      >
        {/* Sticky Header with accent line */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="space-y-0.5">
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900" style={{ color: "var(--color-text-primary)" }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 text-slate-400 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 transition-transform duration-200 hover:rotate-90" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div 
          className="px-6 py-6 overflow-y-auto flex-1 text-[14px]"
          style={{ 
            color: "var(--color-text-secondary)",
            scrollbarWidth: "thin",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
