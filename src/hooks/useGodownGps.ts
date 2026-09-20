"use client";

import { useState, useCallback } from "react";

export interface GpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  hint: string | null;
}

/**
 * useGodownGps — GPS hook for Godown operations.
 * Location is OPTIONAL. Never blocks form submission.
 * Asks for a fresh location every time captureGps() is called (maximumAge: 0).
 */
export function useGodownGps() {
  const [gps, setGps] = useState<GpsState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false,
    error: null,
    hint: null,
  });

  const captureGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGps((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser.",
        hint: "Please use a modern browser like Chrome, Firefox or Safari.",
        loading: false,
      }));
      return;
    }

    // Secure context check
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname.endsWith(".localhost") ||
      window.location.hostname === "127.0.0.1";

    if (!isSecure) {
      setGps((prev) => ({
        ...prev,
        error: "Location access is blocked on non-secure (HTTP) connections.",
        hint: "Please access this app via HTTPS.",
        loading: false,
      }));
      return;
    }

    setGps((prev) => ({ ...prev, loading: true, error: null, hint: null }));

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
        setGps({
          lat: bestPos.coords.latitude,
          lng: bestPos.coords.longitude,
          accuracy: bestPos.coords.accuracy,
          loading: false,
          error: null,
          hint: null,
        });
      } else {
        setGps((prev) => ({
          ...prev,
          error: "Location request timed out.",
          hint: "GPS signal is weak. Make sure location is turned on and try again.",
          loading: false,
        }));
      }
    }, 8000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
          setGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            loading: false,
            error: null,
            hint: null,
          });
        }
        // If accuracy is high enough (<= 15 meters), lock in position immediately
        if (pos.coords.accuracy <= 15) {
          clearTimeout(timerId);
          cleanup();
        }
      },
      (err) => {
        clearTimeout(timerId);
        cleanup();
        if (bestPos) return; // Keep best captured position if available

        let error = "Unable to retrieve location.";
        let hint: string | null = null;

        if (err.code === err.PERMISSION_DENIED) {
          error = "Location permission was denied.";
          hint =
            "Tap the 🔒 lock icon in your browser address bar → Site settings → Location → Allow. Then tap 'Retry GPS'.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          error = "Your device could not determine its location.";
          hint =
            "Make sure GPS / Location Services is enabled in your device settings. Move to an open area and retry.";
        } else if (err.code === err.TIMEOUT) {
          error = "Location request timed out.";
          hint =
            "GPS signal is weak. Move to an open area or near a window and tap 'Retry GPS'.";
        }

        setGps((prev) => ({ ...prev, error, hint, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const resetGps = useCallback(() => {
    setGps({ lat: null, lng: null, accuracy: null, loading: false, error: null, hint: null });
  }, []);

  return { gps, captureGps, resetGps };
}
