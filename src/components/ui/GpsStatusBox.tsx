"use client";

import React from "react";
import type { LocationState } from "@/hooks/useLocation";

// ─── New API (using useLocation hook) ────────────────────────────────────────

interface LocationStatusCardProps {
  location: LocationState;
  onCapture: () => void;
  /** When true, shows the card even in "idle" state */
  showWhenIdle?: boolean;
  /** Optional label text shown above the status */
  label?: string;
}

/**
 * LocationStatusCard — works with the `useLocation` hook.
 *
 * Rules enforced here:
 *  1. Location is NEVER captured automatically — user must tap the button.
 *  2. Location is always OPTIONAL — never blocks form submission.
 *  3. When modal/form opens, status is "idle" — user sees the CTA button.
 *  4. Full error handling with actionable fix hints.
 */
export function LocationStatusCard({
  location,
  onCapture,
  showWhenIdle = false,
  label = "GPS Location",
}: LocationStatusCardProps) {
  const isIdle = location.status === "idle";
  const isLoading = location.status === "loading";
  const isSuccess = location.status === "success";

  // ── Idle: show prominent "Get My Location" CTA ───────────────────────────
  if (isIdle && !showWhenIdle) return null;

  if (isIdle) {
    return (
      <div
        className="rounded-xl border-2 border-dashed p-4 text-center"
        style={{ borderColor: "#CBD5E1", background: "#F8FAFC" }}
      >
        <p className="text-[12px] font-semibold mb-1" style={{ color: "#475569" }}>
          📍 {label} <span className="font-normal text-[11px]" style={{ color: "#94A3B8" }}>(Optional)</span>
        </p>
        <p className="text-[11px] mb-3" style={{ color: "#94A3B8" }}>
          Tap the button to share your current location.
          <br />You can skip this and submit without it.
        </p>
        <button
          type="button"
          onClick={onCapture}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
            boxShadow: "0 2px 8px rgba(37,99,235,0.30)",
          }}
        >
          📍 Get My Location
        </button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-3 border text-xs"
        style={{ background: "#EFF6FF", borderColor: "#BFDBFE", color: "#1D4ED8" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="font-semibold">Getting your location...</p>
            <p className="text-[10px] opacity-70 mt-0.5">
              Allow location access when your browser asks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (isSuccess) {
    const isHighAccuracy = (location.accuracy ?? 999) <= 40;
    return (
      <div
        className="rounded-xl p-3 border text-xs"
        style={{ background: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="text-[16px] flex-shrink-0">{isHighAccuracy ? "🎯" : "📡"}</span>
            <div>
              <p className="font-bold">
                {label} Captured
                <span className="ml-1 font-normal text-[10px] opacity-60">
                  ({isHighAccuracy ? "Satellite GPS ✓" : "Network IP Location ✓"})
                </span>
              </p>
              <p className="font-mono text-[10px] opacity-75 mt-0.5">
                Lat: {location.lat!.toFixed(5)}, Lng: {location.lng!.toFixed(5)}
                {location.accuracy != null && ` (±${location.accuracy.toFixed(0)}m accuracy)`}
              </p>
              {!isHighAccuracy && (
                <p className="text-[9.5px] opacity-70 mt-1 font-sans">
                  💡 Note: PCs/Desktop browsers estimate location via Wi-Fi/IP network. For real satellite GPS hardware accuracy, open on a mobile device.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCapture}
            className="px-2.5 py-1.5 rounded-lg bg-white border font-bold text-[10px] uppercase shadow-sm transition hover:bg-emerald-50 flex-shrink-0"
            style={{ borderColor: "#D1FAE5", color: "#047857" }}
          >
            🔄 Recapture
          </button>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-3 border text-xs"
      style={{ background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" }}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-[16px] flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">{location.error}</p>
            {location.hint && (
              <p className="mt-1 text-[10px] leading-snug opacity-80">{location.hint}</p>
            )}
            <p className="mt-1.5 text-[10px] font-medium" style={{ color: "#64748B" }}>
              💡 Location is optional — you can still submit without it.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCapture}
          className="px-3 py-1.5 rounded-lg bg-white border font-bold text-[11px] uppercase tracking-wide shadow-sm transition hover:bg-amber-50 flex-shrink-0"
          style={{ borderColor: "#FDE68A", color: "#B45309" }}
        >
          📍 Retry
        </button>
      </div>
    </div>
  );
}

// ─── Legacy API (backward-compatible with old GodownGps/DeliveryClient usage) ──

interface GpsStatusBoxProps {
  gps: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
  };
  onRetry: () => void;
  titleText?: string;
  /** When true, shows "optional" messaging instead of "required" */
  optional?: boolean;
}

/**
 * @deprecated Use LocationStatusCard with the useLocation hook instead.
 * Kept for backward compatibility with GodownClient, InternalVehiclesClient.
 */
export function GpsStatusBox({
  gps,
  onRetry,
  titleText = "Acquiring coordinates...",
  optional = false,
}: GpsStatusBoxProps) {
  return (
    <div
      className="mb-4 rounded-xl p-3 border text-xs"
      style={{
        background: gps.loading ? "#F8F8F8" : gps.lat ? "#ECFDF5" : optional ? "#FEF9EC" : "#FEF2F2",
        borderColor: gps.loading ? "#E4E4E7" : gps.lat ? "#A7F3D0" : optional ? "#FDE68A" : "#FCA5A5",
        color: gps.loading ? "#52525B" : gps.lat ? "#065F46" : optional ? "#92400E" : "#991B1B",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {gps.loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold">{titleText}</span>
            </>
          ) : gps.lat ? (
            <>
              <span className="text-[14px]">📍</span>
              <div>
                <span className="font-bold">GPS Location Captured</span>
                <span className="block text-[10px] opacity-75 font-mono">
                  Lat: {gps.lat.toFixed(5)}, Lng: {gps.lng!.toFixed(5)} (±{gps.accuracy?.toFixed(0)}m)
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="text-[14px]">{optional ? "📵" : "⚠️"}</span>
              <div>
                <span className="font-bold">
                  {optional ? "Location Not Captured: " : "Location Required: "}
                </span>
                <span>{gps.error || "Please allow location access to record this action."}</span>
                {optional && (
                  <span className="block text-[10px] opacity-70 mt-0.5">
                    💡 This is optional — you can still submit without location.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {!gps.loading && (
          <button
            type="button"
            onClick={onRetry}
            className="px-2 py-1 rounded bg-white border font-bold text-[10px] uppercase shadow-sm transition hover:bg-zinc-50"
            style={{
              borderColor: gps.lat ? "#D1FAE5" : optional ? "#FDE68A" : "#FCA5A5",
              color: gps.lat ? "#047857" : optional ? "#92400E" : "#DC2626",
            }}
          >
            {gps.lat ? "Recapture" : "Retry GPS"}
          </button>
        )}
      </div>
    </div>
  );
}
