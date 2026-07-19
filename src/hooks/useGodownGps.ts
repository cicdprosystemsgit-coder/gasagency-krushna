"use client";

import { useState, useCallback } from "react";

export interface GpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGodownGps() {
  const [gps, setGps] = useState<GpsState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const captureGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGps((prev) => ({
        ...prev,
        error: "Geolocation not supported by browser.",
        loading: false,
      }));
      return;
    }

    setGps((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        let msg = "Unable to retrieve location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location information unavailable. Verify GPS is active.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out.";
        }
        setGps((prev) => ({ ...prev, error: msg, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const resetGps = useCallback(() => {
    setGps({ lat: null, lng: null, accuracy: null, loading: false, error: null });
  }, []);

  return { gps, captureGps, resetGps };
}
