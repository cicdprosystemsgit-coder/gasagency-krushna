"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary" | "info";
}

type ConfirmFunction = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFunction | null>(null);

export function useConfirm(): ConfirmFunction {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return context;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback<ConfirmFunction>((options) => {
    const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options: opts,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(
    (result: boolean) => {
      if (dialogState) {
        dialogState.resolve(result);
        setDialogState(null);
      }
    },
    [dialogState]
  );

  useEffect(() => {
    if (!dialogState?.isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus confirm button
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogState?.isOpen, handleClose]);

  const variant = dialogState?.options.variant || "danger";
  const title =
    dialogState?.options.title ||
    (variant === "danger"
      ? "Confirm Deletion"
      : variant === "warning"
      ? "Warning"
      : "Please Confirm");
  const confirmText = dialogState?.options.confirmText || (variant === "danger" ? "Delete" : "Confirm");
  const cancelText = dialogState?.options.cancelText || "Cancel";

  const renderIcon = () => {
    switch (variant) {
      case "danger":
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Trash2 className="w-5 h-5" />
          </div>
        );
      case "warning":
        return (
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent focus:ring-red-500 shadow-sm";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-transparent focus:ring-amber-500 shadow-sm";
      default:
        return "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent focus:ring-blue-500 shadow-sm";
    }
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {mounted &&
        dialogState?.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
              onClick={() => handleClose(false)}
            />

            {/* Modal Dialog Card */}
            <div
              role="alertdialog"
              aria-modal="true"
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all transform animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Close 'X' button */}
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                {renderIcon()}
                <div className="flex-1 pr-2">
                  <h3 className="text-[16px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                    {dialogState.options.message}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonClasses()}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmDialogContext.Provider>
  );
}
