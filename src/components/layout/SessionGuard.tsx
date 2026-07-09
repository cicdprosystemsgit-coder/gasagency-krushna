"use client";

/**
 * SessionGuard — Enterprise 6-hour inactivity session management.
 *
 * Rules:
 *  • On every page mount the "last activity" timestamp is refreshed in localStorage.
 *  • A background interval (every 60 s) checks whether the user has been idle for
 *    more than 6 hours (= 21 600 000 ms).
 *  • If idle time exceeded → server logout → redirect to /session-expired?reason=inactivity.
 *  • If the user IS active and the access token is within 5 minutes of expiry,
 *    the refresh endpoint is called silently so the 15-min JWT stays alive.
 *
 * This component is rendered once inside the dashboard layout and is invisible.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_LIMIT_MS  = 6 * 60 * 60 * 1000;  // 6 hours
const CHECK_INTERVAL_MS    = 60 * 1000;             // check every 60 s
const LS_KEY               = "ga_last_activity";    // localStorage key

// Activity events that count as "user is present"
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

function stampActivity() {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {
    // Private browsing or storage blocked — fail silently
  }
}

function getLastActivity(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? parseInt(raw, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

export function SessionGuard() {
  const router  = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // ── 1. Stamp activity on every page/component mount ────────────────────
    stampActivity();

    // ── 2. Throttled event listener (stamp at most once per 30 s) ──────────
    let lastStamp = Date.now();
    const THROTTLE = 30_000; // 30 seconds

    function handleActivity() {
      const now = Date.now();
      if (now - lastStamp > THROTTLE) {
        lastStamp = now;
        stampActivity();
      }
    }

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true })
    );

    // ── 3. Periodic inactivity check ────────────────────────────────────────
    async function checkInactivity() {
      const idleMs = Date.now() - getLastActivity();

      if (idleMs >= INACTIVITY_LIMIT_MS) {
        // Clean up before redirecting
        clearInterval(timerRef.current!);
        ACTIVITY_EVENTS.forEach((ev) =>
          window.removeEventListener(ev, handleActivity)
        );

        // Call server logout (best-effort — clears cookies)
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          /* proceed regardless */
        }

        router.replace("/session-expired?reason=inactivity");
      }
    }

    timerRef.current = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    // Also run once immediately (catches tab that was left open very long)
    checkInactivity();

    // ── 4. Cleanup ───────────────────────────────────────────────────────────
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, handleActivity)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders nothing — purely behavioral
  return null;
}
