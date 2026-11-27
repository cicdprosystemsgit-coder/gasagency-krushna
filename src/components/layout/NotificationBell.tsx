"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date | string;
};

const TYPE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  LEAVE_REQUEST:                  { bg: "#EFF6FF", color: "#2563EB", label: "Leave" },
  LEAVE_APPROVED:                 { bg: "#F0FDF4", color: "#16A34A", label: "Leave" },
  LEAVE_REJECTED:                 { bg: "#FEF2F2", color: "#DC2626", label: "Leave" },
  SALARY_REQUEST:                 { bg: "#FFFBEB", color: "#D97706", label: "Salary" },
  SALARY_APPROVED:                { bg: "#F0FDF4", color: "#16A34A", label: "Salary" },
  SALARY_REJECTED:                { bg: "#FEF2F2", color: "#DC2626", label: "Salary" },
  DELIVERY_REQUEST:               { bg: "#EFF6FF", color: "#2563EB", label: "Delivery" },
  DELIVERY_APPROVED:              { bg: "#F0FDF4", color: "#16A34A", label: "Delivery" },
  DELIVERY_REJECTED:              { bg: "#FEF2F2", color: "#DC2626", label: "Delivery" },
  DELIVERY_FULFILLED:             { bg: "#ECFDF5", color: "#059669", label: "Loaded" },
  EXPENSE_REQUEST:                { bg: "#FFF7ED", color: "#EA580C", label: "Expense" },
  EXPENSE_APPROVED:               { bg: "#F0FDF4", color: "#16A34A", label: "Expense" },
  EXPENSE_REJECTED:               { bg: "#FEF2F2", color: "#DC2626", label: "Expense" },
  ATTENDANCE_REGULARIZATION:      { bg: "#F5F3FF", color: "#7C3AED", label: "Attendance" },
  ATTENDANCE_REGULARIZATION_STATUS: { bg: "#F0FDF4", color: "#16A34A", label: "Attendance" },
  LOW_STOCK:                      { bg: "#FFF7ED", color: "#EA580C", label: "Stock" },
  VEHICLE_RENEWAL:                { bg: "#FEF2F2", color: "#DC2626", label: "Renewal" },
  DAILY_SUMMARY:                  { bg: "#F5F3FF", color: "#7C3AED", label: "Summary" },
  DAILY_SUMMARY_REVIEWED:         { bg: "#F0FDF4", color: "#16A34A", label: "Summary" },
  COMPLAINT_RAISED:               { bg: "#FEF2F2", color: "#DC2626", label: "Complaint" },
  COMPLAINT_RESOLVED:             { bg: "#F0FDF4", color: "#16A34A", label: "Complaint" },
  PAYMENT_RECEIVED:               { bg: "#F0FDF4", color: "#16A34A", label: "Payment" },
  SYSTEM_WELCOME:                 { bg: "#ECFDF5", color: "#059669", label: "System" },
};

function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [bellHighlight, setBellHighlight] = useState(false);
  const [, startTransition] = useTransition();
  const { isMuted, toggleMute } = useNotificationSound();
  const router = useRouter();

  const load = () => {
    startTransition(async () => {
      const res = await getMyNotifications();
      setNotifications(res.notifications as Notification[]);
      setUnreadCount(res.unreadCount);
    });
  };

  useEffect(() => {
    load();

    const onUpdated = (e: Event) => {
      const detail = (
        e as CustomEvent<{ notifications: Notification[]; unreadCount: number }>
      ).detail;
      if (detail) {
        setNotifications(detail.notifications);
        setUnreadCount(detail.unreadCount);
      }
    };

    const onRead = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    };

    const onOpenDrawer = () => {
      setOpen(true);
      load();
    };

    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    const onNewArrival = (e: Event) => {
      const ids = (e as CustomEvent<{ ids?: string[] }>).detail?.ids ?? [];
      if (ids.length > 0) {
        setHighlightedIds((prev) => new Set([...prev, ...ids]));
      }
      setBellHighlight(true);
      if (highlightTimer) clearTimeout(highlightTimer);
      highlightTimer = setTimeout(() => {
        setBellHighlight(false);
      }, 3500);
    };

    window.addEventListener("ga:notifications-updated", onUpdated);
    window.addEventListener("ga:notification-read", onRead);
    window.addEventListener("ga:open-notifications", onOpenDrawer);
    window.addEventListener("ga:new-notification-arrived", onNewArrival);

    return () => {
      window.removeEventListener("ga:notifications-updated", onUpdated);
      window.removeEventListener("ga:notification-read", onRead);
      window.removeEventListener("ga:open-notifications", onOpenDrawer);
      window.removeEventListener("ga:new-notification-arrived", onNewArrival);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, []);

  // Lock background page scroll on mobile/desktop when drawer is open & close on Escape
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setHighlightedIds(new Set());
  };

  const handleToggle = () => {
    const nextState = !open;
    setOpen(nextState);
    setBellHighlight(false);
    if (nextState) {
      load();
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      void handleMarkRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative">
      {/* Navbar Bell Trigger */}
      <motion.button
        id="notification-bell-btn"
        type="button"
        onClick={handleToggle}
        animate={
          bellHighlight
            ? { scale: [1, 1.18, 0.95, 1.1, 1], rotate: [0, -12, 12, -6, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.6 }}
        className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer touch-manipulation active:scale-95 ${
          bellHighlight
            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/40"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center bg-red-600 shadow-xs"
              style={{ transform: "translate(25%, -25%)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Left-Side Slide-Over Drawer (Desktop) & Full-Screen Panel (Mobile) */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            {/* Drawer: Full screen on mobile (inset-0), Right-side drawer on desktop (sm:inset-y-0 sm:right-0 sm:w-[400px]) */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[400px] z-[60] flex flex-col bg-white dark:bg-zinc-900 sm:border-l border-zinc-200 dark:border-zinc-800 shadow-2xl"
              style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                        Notifications
                      </p>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-red-600">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Real-time agency updates & alerts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Sound Mute/Unmute Toggle */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={
                      isMuted
                        ? "Unmute notification sound"
                        : "Mute notification sound"
                    }
                    aria-label={
                      isMuted
                        ? "Unmute notification sound"
                        : "Mute notification sound"
                    }
                    className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                      isMuted
                        ? "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                    }`}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span className="text-[11px]">
                      {isMuted ? "Muted" : "Sound"}
                    </span>
                  </button>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer touch-manipulation"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span className="hidden xs:inline">All read</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-manipulation"
                    aria-label="Close notifications"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer touch-manipulation ${
                    filter === "all"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer touch-manipulation ${
                    filter === "unread"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {visibleNotifications.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <Bell className="w-9 h-9 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400">
                      {filter === "unread"
                        ? "You're all caught up!"
                        : "No notifications yet"}
                    </p>
                    <p className="text-[12px] text-zinc-400 mt-1">
                      New alerts will appear here automatically.
                    </p>
                  </div>
                ) : (
                  visibleNotifications.map((n) => {
                    const meta = TYPE_ICONS[n.type] ?? {
                      bg: "#F4F4F5",
                      color: "#71717A",
                      label: n.type,
                    };
                    const isNewlyHighlighted = highlightedIds.has(n.id);

                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={
                          isNewlyHighlighted
                            ? { opacity: 0, x: -24, backgroundColor: "rgba(37, 99, 235, 0.14)" }
                            : false
                        }
                        animate={{
                          opacity: 1,
                          x: 0,
                          backgroundColor: isNewlyHighlighted
                            ? "rgba(37, 99, 235, 0.08)"
                            : "rgba(0, 0, 0, 0)",
                        }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        onClick={() => handleNotificationClick(n)}
                        className={`relative flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors group touch-manipulation ${
                          n.link ? "cursor-pointer" : ""
                        } ${
                          !n.isRead ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Left accent bar for highlighted/unread items */}
                        {!n.isRead && (
                          <span
                            className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
                              isNewlyHighlighted
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-blue-600"
                            }`}
                          />
                        )}

                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label.charAt(0)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {isNewlyHighlighted && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                <Sparkles className="w-2.5 h-2.5" /> New
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-[13.5px] leading-snug mt-1 text-zinc-900 dark:text-zinc-100 ${
                              n.isRead ? "font-normal" : "font-semibold"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                            {n.body}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                if (!n.isRead) void handleMarkRead(n.id);
                              }}
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors touch-manipulation"
                              title="Go to page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleMarkRead(n.id);
                              }}
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer touch-manipulation"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 text-center border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                  <p className="text-[11px] text-zinc-400">
                    Showing last {notifications.length} notifications
                  </p>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
