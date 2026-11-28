"use client";

import { useEffect } from "react";

/**
 * Registers the Capacitor Android device for FCM push notifications,
 * sends the device token to POST /api/notifications, and handles notification taps.
 * No-ops gracefully when running in a standard web browser.
 */
export function usePushNotifications() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function register() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import("@capacitor/push-notifications");

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") return;

        const regListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            try {
              await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pushToken: token.value }),
              });
            } catch {
              // Ignore network failures during registration
            }
          }
        );

        const errListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.error("[Push] Registration error:", err);
          }
        );

        const fgListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[Push] Foreground notification:", notification);
          }
        );

        const tapListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const link = action.notification.data?.link;
            if (typeof link === "string" && link.startsWith("/")) {
              window.location.href = link;
            }
          }
        );

        await PushNotifications.register();

        cleanup = () => {
          regListener.remove();
          errListener.remove();
          fgListener.remove();
          tapListener.remove();
        };
      } catch {
        // Not running inside Capacitor native container
      }
    }

    register();

    return () => {
      cleanup?.();
    };
  }, []);
}

