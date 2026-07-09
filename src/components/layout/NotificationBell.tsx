"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
};

const TYPE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  LEAVE_REQUEST:      { bg: "#EFF6FF", color: "#2563EB", label: "Leave" },
  LEAVE_APPROVED:     { bg: "#F0FDF4", color: "#16A34A", label: "Leave" },
  LEAVE_REJECTED:     { bg: "#FEF2F2", color: "#DC2626", label: "Leave" },
  SALARY_REQUEST:     { bg: "#FFFBEB", color: "#D97706", label: "Salary" },
  SALARY_APPROVED:    { bg: "#F0FDF4", color: "#16A34A", label: "Salary" },
  SALARY_REJECTED:    { bg: "#FEF2F2", color: "#DC2626", label: "Salary" },
  LOW_STOCK:          { bg: "#FFF7ED", color: "#EA580C", label: "Stock" },
  VEHICLE_RENEWAL:    { bg: "#FEF2F2", color: "#DC2626", label: "Renewal" },
  DAILY_SUMMARY:      { bg: "#F5F3FF", color: "#7C3AED", label: "Summary" },
  COMPLAINT_RAISED:   { bg: "#FEF2F2", color: "#DC2626", label: "Complaint" },
  COMPLAINT_RESOLVED: { bg: "#F0FDF4", color: "#16A34A", label: "Complaint" },
  PAYMENT_RECEIVED:   { bg: "#F0FDF4", color: "#16A34A", label: "Payment" },
};

function timeAgo(date: Date): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const res = await getMyNotifications();
      setNotifications(res.notifications as Notification[]);
      setUnreadCount(res.unreadCount);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleToggle = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) {
      load();
    }
  };

  return (
    <div className="relative">
      <button
        id="notification-bell-btn"
        onClick={handleToggle}
        className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-zinc-100"
        style={{ color: "#71717A" }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: "#DC2626", transform: "translate(30%, -30%)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="absolute right-0 top-10 w-80 rounded-xl z-50 overflow-hidden animate-fade-in"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E4E7",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid #E4E4E7" }}
            >
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-zinc-900">Notifications</p>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: "#DC2626" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" /> All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-zinc-200" />
                  <p className="text-[13px] text-zinc-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_ICONS[n.type] ?? {
                    bg: "#F4F4F5", color: "#71717A", label: n.type,
                  };
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
                      style={{ background: n.isRead ? undefined : "#FAFEFF" }}
                    >
                      {/* Icon */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label.charAt(0)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] leading-snug"
                          style={{
                            color: "#18181B",
                            fontWeight: n.isRead ? 400 : 600,
                          }}
                        >
                          {n.title}
                        </p>
                        <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[11px] text-zinc-300 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => { setOpen(false); if (!n.isRead) handleMarkRead(n.id); }}
                            className="flex items-center justify-center w-6 h-6 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Go to page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="flex items-center justify-center w-6 h-6 rounded text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                          style={{ background: "#2563EB" }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div
                className="px-4 py-2.5 text-center"
                style={{ borderTop: "1px solid #E4E4E7" }}
              >
                <p className="text-[11px] text-zinc-400">
                  Showing last {notifications.length} notifications
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
