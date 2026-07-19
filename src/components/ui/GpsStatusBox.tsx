"use client";

import React from "react";

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
}

export function GpsStatusBox({ gps, onRetry, titleText = "Acquiring coordinates..." }: GpsStatusBoxProps) {
  return (
    <div className="mb-4 rounded-xl p-3 border text-xs" style={{
      background: gps.loading ? "#F8F8F8" : gps.lat ? "#ECFDF5" : "#FEF2F2",
      borderColor: gps.loading ? "#E4E4E7" : gps.lat ? "#A7F3D0" : "#FCA5A5",
      color: gps.loading ? "#52525B" : gps.lat ? "#065F46" : "#991B1B"
    }}>
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
              <span className="text-[14px]">⚠️</span>
              <div>
                <span className="font-bold">Location Required: </span>
                <span>{gps.error || "Please allow location access to record this action."}</span>
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
              borderColor: gps.lat ? "#D1FAE5" : "#FCA5A5",
              color: gps.lat ? "#047857" : "#DC2626"
            }}
          >
            {gps.lat ? "Recapture" : "Retry GPS"}
          </button>
        )}
      </div>
    </div>
  );
}
