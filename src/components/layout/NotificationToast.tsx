"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, ExternalLink, Check, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string | Date;
}

const TYPE_META: Record<
  string,
  { bg: string; color: string; accent: string; label: string }
> = {
  LEAVE_REQUEST:                  { bg: "#EFF6FF", color: "#2563EB", accent: "#3B82F6", label: "Leave" },
  LEAVE_APPROVED:                 { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Approved" },
  LEAVE_REJECTED:                 { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Rejected" },
  SALARY_REQUEST:                 { bg: "#FFFBEB", color: "#D97706", accent: "#F59E0B", label: "Salary" },
  SALARY_APPROVED:                { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Salary" },
  SALARY_REJECTED:                { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Salary" },
  DELIVERY_REQUEST:               { bg: "#EFF6FF", color: "#2563EB", accent: "#3B82F6", label: "Delivery" },
  DELIVERY_APPROVED:              { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Delivery" },
  DELIVERY_REJECTED:              { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Delivery" },
  DELIVERY_FULFILLED:             { bg: "#ECFDF5", color: "#059669", accent: "#10B981", label: "Loaded" },
  EXPENSE_REQUEST:                { bg: "#FFF7ED", color: "#EA580C", accent: "#F97316", label: "Expense" },
  EXPENSE_APPROVED:               { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Expense" },
  EXPENSE_REJECTED:               { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Expense" },
  ATTENDANCE_REGULARIZATION:      { bg: "#F5F3FF", color: "#7C3AED", accent: "#8B5CF6", label: "Attendance" },
  ATTENDANCE_REGULARIZATION_STATUS: { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Attendance" },
  LOW_STOCK:                      { bg: "#FFF7ED", color: "#EA580C", accent: "#F97316", label: "Stock Alert" },
  VEHICLE_RENEWAL:                { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Renewal" },
  DAILY_SUMMARY:                  { bg: "#F5F3FF", color: "#7C3AED", accent: "#8B5CF6", label: "Summary" },
  DAILY_SUMMARY_REVIEWED:         { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Summary" },
  COMPLAINT_RAISED:               { bg: "#FEF2F2", color: "#DC2626", accent: "#EF4444", label: "Complaint" },
  COMPLAINT_RESOLVED:             { bg: "#F0FDF4", color: "#16A34A", accent: "#22C55E", label: "Resolved" },
  PAYMENT_RECEIVED:               { bg: "#F0FDF4", color: "#16A34A", accent: "#10B981", label: "Payment" },
  SYSTEM_WELCOME:                 { bg: "#ECFDF5", color: "#059669", accent: "#10B981", label: "System" },
};

const TOAST_DURATION_MS = 5000;
const POLL_INTERVAL_MS = 12000;

export function NotificationToast() {
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const router = useRouter();
  const { play } = useNotificationSound();

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (notification: AppNotification) => {
      setToasts((prev) => {
        if (prev.some((t) => t.id === notification.id)) return prev;
        // Keep max 3 stacked toasts
        return [notification, ...prev].slice(0, 3);
      });

      const timer = setTimeout(() => {
        dismissToast(notification.id);
      }, TOAST_DURATION_MS);
      timersRef.current.set(notification.id, timer);
    },
    [dismissToast]
  );

  const pollNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const list: AppNotification[] = json.data ?? [];
      const unreadCount: number = json.unreadCount ?? 0;

      // Broadcast latest notifications so NotificationBell stays synced
      window.dispatchEvent(
        new CustomEvent("ga:notifications-updated", {
          detail: { notifications: list, unreadCount },
        })
      );

      if (!initializedRef.current) {
        // Seed initial IDs so old notifications don't pop up on page load
        for (const n of list) {
          seenIdsRef.current.add(n.id);
        }
        initializedRef.current = true;
        return;
      }

      const newlyArrived = list.filter(
        (n) => !n.isRead && !seenIdsRef.current.has(n.id)
      );

      for (const n of list) {
        seenIdsRef.current.add(n.id);
      }

      if (newlyArrived.length > 0) {
        play();
        window.dispatchEvent(
          new CustomEvent("ga:new-notification-arrived", {
            detail: { ids: newlyArrived.map((n) => n.id) },
          })
        );
        // Show newest first (up to 3)
        for (const n of newlyArrived.slice(0, 3).reverse()) {
          showToast(n);
        }
      }
    } catch {
      // Silently ignore polling network errors
    }
  }, [play, showToast]);

  useEffect(() => {
    const timers = timersRef.current;
    pollNotifications();
    const interval = setInterval(pollNotifications, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        pollNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [pollNotifications]);

  const handleMarkRead = async (n: AppNotification) => {
    dismissToast(n.id);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      window.dispatchEvent(new CustomEvent("ga:notification-read", { detail: { id: n.id } }));
    } catch {
      // Ignore
    }
  };

  const handleOpen = async (n: AppNotification) => {
    await handleMarkRead(n);
    if (n.link) {
      router.push(n.link);
    } else {
      document.getElementById("notification-bell-btn")?.click();
    }
  };

  return (
    <div
      className="fixed left-3 right-3 sm:left-auto sm:right-4 sm:w-[360px] z-[100] pointer-events-none flex flex-col gap-2"
      style={{ top: "calc(var(--app-header-height, 52px) + 8px)" }}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((n) => {
          const meta = TYPE_META[n.type] ?? {
            bg: "#EFF6FF",
            color: "#2563EB",
            accent: "#2563EB",
            label: "Alert",
          };
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -70, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              drag="y"
              dragConstraints={{ top: -80, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y < -30) dismissToast(n.id);
              }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-700/80 shadow-[0_14px_34px_-6px_rgba(0,0,0,0.18)] touch-manipulation cursor-pointer"
              onClick={() => handleOpen(n)}
            >
              <div className="flex items-start gap-3 p-3.5">
                {/* WhatsApp-style avatar with pulse indicator */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-xs"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center"
                    style={{ background: meta.accent }}
                  >
                    <Bell className="w-2 h-2 text-white" />
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                        now
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissToast(n.id);
                      }}
                      aria-label="Dismiss notification"
                      className="p-1 -mr-1 -mt-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 mt-1 leading-snug truncate">
                    {n.title}
                  </p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                    {n.body}
                  </p>

                  {/* Quick action chips */}
                  <div className="flex items-center gap-2 mt-2">
                    {n.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        <ExternalLink className="w-3 h-3" /> View
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(n);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline touch-manipulation"
                    >
                      <Check className="w-3 h-3" /> Mark read
                    </button>
                  </div>
                </div>
              </div>

              {/* Animated countdown progress bar */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: TOAST_DURATION_MS / 1000, ease: "linear" }}
                className="h-[3px]"
                style={{ background: meta.accent }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

