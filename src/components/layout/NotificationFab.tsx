"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, BellRing } from "lucide-react";

/**
 * Floating chatbot-style notification button with live unread count badge
 * and smooth highlight/ripple animation when a new notification arrives.
 */
export function NotificationFab() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ unreadCount: number }>).detail;
      if (detail && typeof detail.unreadCount === "number") {
        setUnreadCount(detail.unreadCount);
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onNewArrival = () => {
      setHighlight(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setHighlight(false), 3500);
    };

    window.addEventListener("ga:notifications-updated", onUpdated);
    window.addEventListener("ga:new-notification-arrived", onNewArrival);

    return () => {
      window.removeEventListener("ga:notifications-updated", onUpdated);
      window.removeEventListener("ga:new-notification-arrived", onNewArrival);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleClick = () => {
    setHighlight(false);
    window.dispatchEvent(new Event("ga:open-notifications"));
  };

  return (
    <div className="fixed bottom-[calc(var(--app-bottom-nav-height,60px)+14px)] right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Smooth expanding highlight rings when a new message arrives */}
      <AnimatePresence>
        {highlight && (
          <>
            <motion.span
              key="ring-1"
              initial={{ scale: 0.9, opacity: 0.75 }}
              animate={{ scale: 1.75, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-blue-500 pointer-events-none"
            />
            <motion.span
              key="ring-2"
              initial={{ scale: 0.9, opacity: 0.55 }}
              animate={{ scale: 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.2,
                delay: 0.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        aria-label="Open notifications"
        title="Notifications"
        animate={
          highlight
            ? {
                scale: [1, 1.12, 0.96, 1.08, 1],
                rotate: [0, -8, 8, -4, 0],
              }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.65, ease: "easeInOut" }}
        whileTap={{ scale: 0.92 }}
        className={`relative flex items-center justify-center w-13 h-13 rounded-full text-white shadow-lg cursor-pointer touch-manipulation transition-shadow ${
          highlight
            ? "bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-600 shadow-[0_0_24px_rgba(16,185,129,0.65)] ring-2 ring-white/80 dark:ring-zinc-900"
            : "bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/30"
        }`}
      >
        {highlight ? (
          <BellRing className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* Live Unread Number Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

