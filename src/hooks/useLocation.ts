"use client";

import { useState, useCallback } from "react";

export type LocationStatus = "idle" | "loading" | "success" | "denied" | "unavailable" | "timeout" | "unsupported" | "insecure";

export interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: LocationStatus;
  /** Human-readable error message, null when no error */
  error: string | null;
  /** Step-by-step fix hint shown to user */
  hint: string | null;
}

const INITIAL_STATE: LocationState = {
  lat: null,
  lng: null,
  accuracy: null,
  status: "idle",
  error: null,
  hint: null,
};

/**
 * Universal GPS/Location hook
 * - Asks for location permission every time (maximumAge: 0 — no cache)
 * - Location is OPTIONAL; never blocks form submission
 * - Classifies every possible error with a friendly message and a fix hint
 * - Works on HTTPS / localhost; gracefully degrades on HTTP
 */
export function useLocation(options?: { timeout?: number; highAccuracy?: boolean }) {
  const timeout = options?.timeout ?? 10000;
  const highAccuracy = options?.highAccuracy ?? true;

  const [location, setLocation] = useState<LocationState>(INITIAL_STATE);

  const captureLocation = useCallback(() => {
    // SSR guard
    if (typeof window === "undefined") {
      setLocation({
        ...INITIAL_STATE,
        status: "unsupported",
        error: "Location is not available in this environment.",
        hint: null,
      });
      return;
    }

    // Browser support check
    if (!navigator.geolocation) {
      setLocation({
        ...INITIAL_STATE,
        status: "unsupported",
        error: "Your browser does not support location services.",
        hint: "Please use a modern browser like Chrome, Firefox or Safari.",
      });
      return;
    }

    // Secure context check (geolocation requires HTTPS or localhost)
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname.endsWith(".localhost") ||
      window.location.hostname === "127.0.0.1";

    if (!isSecure) {
      setLocation({
        ...INITIAL_STATE,
        status: "insecure",
        error: "Location access is blocked on non-secure (HTTP) connections.",
        hint: "Please access this app via HTTPS.",
      });
      return;
    }

    // Start loading
    setLocation((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      hint: null,
    }));

    let bestPos: GeolocationPosition | null = null;
    let watchId: number | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const timerId = setTimeout(() => {
      cleanup();
      if (bestPos) {
        setLocation({
          lat: bestPos.coords.latitude,
          lng: bestPos.coords.longitude,
          accuracy: bestPos.coords.accuracy,
          status: "success",
          error: null,
          hint: null,
        });
      } else {
        setLocation({
          lat: null,
          lng: null,
          accuracy: null,
          status: "timeout",
          error: "Location request timed out.",
          hint: "GPS signal is weak. Move to an open area or near a window and tap 'Retry'.",
        });
      }
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            status: "success",
            error: null,
            hint: null,
          });
        }
        // Lock in position immediately if high precision satellite fix acquired
        if (pos.coords.accuracy <= 15) {
          clearTimeout(timerId);
          cleanup();
        }
      },
      (err) => {
        clearTimeout(timerId);
        cleanup();
        if (bestPos) return; // Retain best position if available

        let status: LocationStatus = "denied";
        let error = "Unable to retrieve your location.";
        let hint: string | null = null;

        if (err.code === err.PERMISSION_DENIED) {
          status = "denied";
          error = "Location permission was denied.";
          hint =
            "Tap the 🔒 lock icon in your browser address bar → Site settings → Location → Allow. Then tap 'Retry'.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          status = "unavailable";
          error = "Your device could not determine its location.";
          hint =
            "Make sure GPS / Location Services is turned on in your device settings. Move to an open area with better signal and retry.";
        } else if (err.code === err.TIMEOUT) {
          status = "timeout";
          error = "Location request timed out.";
          hint =
            "Your GPS signal is weak. Move to an open area or near a window and tap 'Retry'.";
        } else {
          status = "denied";
          error = `Location error: ${err.message}`;
          hint = "Please check your browser and device location settings, then retry.";
        }

        setLocation({
          lat: null,
          lng: null,
          accuracy: null,
          status,
          error,
          hint,
        });
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 0, // Always ask fresh
      }
    );
  }, [timeout, highAccuracy]);

  const resetLocation = useCallback(() => {
    setLocation(INITIAL_STATE);
  }, []);

  return {
    location,
    captureLocation,
    resetLocation,
    /** Convenience boolean */
    isLoading: location.status === "loading",
    /** Convenience boolean */
    hasCaptured: location.status === "success",
    /** Convenience boolean */
    hasError:
      location.status !== "idle" &&
      location.status !== "loading" &&
      location.status !== "success",
  };
}
