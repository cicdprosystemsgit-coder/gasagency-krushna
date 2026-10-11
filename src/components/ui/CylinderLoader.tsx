"use client";

import React from "react";

export interface CylinderLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "red" | "blue" | "primary";
  message?: string;
  subtitle?: string;
  fullscreen?: boolean;
  className?: string;
  showVapor?: boolean;
}

const SIZE_CONFIGS = {
  sm: {
    width: 38,
    height: 64,
    shadowWidth: 32,
    shadowHeight: 8,
    textClass: "text-xs",
    subClass: "text-[10px]",
  },
  md: {
    width: 60,
    height: 104,
    shadowWidth: 52,
    shadowHeight: 12,
    textClass: "text-sm font-semibold",
    subClass: "text-xs",
  },
  lg: {
    width: 82,
    height: 142,
    shadowWidth: 72,
    shadowHeight: 16,
    textClass: "text-base font-bold",
    subClass: "text-xs",
  },
  xl: {
    width: 105,
    height: 182,
    shadowWidth: 92,
    shadowHeight: 20,
    textClass: "text-lg font-bold",
    subClass: "text-sm",
  },
};

export function CylinderLoader({
  size = "md",
  color = "red",
  message,
  subtitle,
  fullscreen = false,
  className = "",
  showVapor = true,
}: CylinderLoaderProps) {
  const conf = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  // Colors tailored to standard Indian LPG cylinders (Red/Orange Bharat/Indane/HP style, or Blue Commercial)
  const isBlue = color === "blue";
  const primaryLight = isBlue ? "#3B82F6" : "#EF4444";
  const primaryMain = isBlue ? "#2563EB" : "#DC2626";
  const primaryDark = isBlue ? "#1D4ED8" : "#B91C1C";
  const primaryDeep = isBlue ? "#1E3A8A" : "#7F1D1D";
  const highlight = isBlue ? "#93C5FD" : "#FCA5A5";

  const loaderBody = (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* ── Main Cylinder & Hover Container ── */}
      <div className="relative flex flex-col items-center justify-center">
        
        {/* Floating Vapor / Gas Puff Particles rising from top valve */}
        {showVapor && size !== "sm" && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 w-8 h-8 flex items-center justify-center">
            {/* Vapor Puff 1 */}
            <span
              className="absolute w-2 h-2 rounded-full bg-cyan-400/80 blur-[1px] animate-gas-puff-1"
              style={{ left: "30%" }}
            />
            {/* Vapor Puff 2 */}
            <span
              className="absolute w-2.5 h-2.5 rounded-full bg-blue-400/70 blur-[1px] animate-gas-puff-2"
              style={{ left: "55%" }}
            />
            {/* Vapor Puff 3 */}
            <span
              className="absolute w-2 h-2 rounded-full bg-sky-300/80 blur-[1px] animate-gas-puff-3"
              style={{ left: "42%" }}
            />
          </div>
        )}

        {/* Floating Animated Cylinder SVG */}
        <div className="animate-cylinder-float transition-transform duration-300">
          <svg
            width={conf.width}
            height={conf.height}
            viewBox="0 0 100 175"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_8px_16px_rgba(220,38,38,0.22)]"
          >
            <defs>
              {/* Cylinder 3D Body Metallic Gradient */}
              <linearGradient id={`cylGrad_${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={primaryDeep} />
                <stop offset="18%" stopColor={primaryMain} />
                <stop offset="38%" stopColor={highlight} stopOpacity="0.9" />
                <stop offset="55%" stopColor={primaryLight} />
                <stop offset="82%" stopColor={primaryMain} />
                <stop offset="100%" stopColor={primaryDark} />
              </linearGradient>

              {/* Collar / Guard Ring Gradient */}
              <linearGradient id={`collarGrad_${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={primaryDeep} />
                <stop offset="25%" stopColor={primaryMain} />
                <stop offset="45%" stopColor={highlight} />
                <stop offset="70%" stopColor={primaryMain} />
                <stop offset="100%" stopColor={primaryDeep} />
              </linearGradient>

              {/* Shimmer Sweep Animation Gradient */}
              <linearGradient id={`shimmerGrad_${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Brass Valve Metallic Gradient */}
              <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#854D0E" />
                <stop offset="40%" stopColor="#FACC15" />
                <stop offset="70%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#713F12" />
              </linearGradient>

              {/* Base Ring Gradient */}
              <linearGradient id={`baseGrad_${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={primaryDeep} />
                <stop offset="50%" stopColor={primaryMain} />
                <stop offset="100%" stopColor={primaryDeep} />
              </linearGradient>
            </defs>

            {/* ── 1. Top Valve Mechanism ── */}
            {/* Valve stem */}
            <rect x="46" y="10" width="8" height="12" rx="1.5" fill="url(#brassGrad)" />
            {/* Valve turn wheel */}
            <rect x="42" y="8" width="16" height="4" rx="2" fill="#CA8A04" stroke="#713F12" strokeWidth="0.8" />
            <circle cx="50" cy="10" r="1.5" fill="#451A03" />

            {/* Valve safety outlet nozzle */}
            <rect x="54" y="14" width="6" height="4" rx="1" fill="url(#brassGrad)" />

            {/* Subtle blue gas flame glow at valve */}
            <circle cx="50" cy="7" r="3.5" fill="#38BDF8" className="animate-cylinder-flame blur-[1px]" />

            {/* ── 2. Top Collar / Handle Guard ── */}
            <path
              d="M 24 34 L 26 18 C 27 15 32 13 50 13 C 68 13 73 15 74 18 L 76 34"
              stroke={`url(#collarGrad_${color})`}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            {/* Inner Handle Grip Openings */}
            {/* Left handle cutout */}
            <rect x="28" y="18" width="12" height="6" rx="2.5" fill="#FFFFFF" fillOpacity="0.12" stroke={primaryDeep} strokeWidth="1.2" />
            {/* Right handle cutout */}
            <rect x="60" y="18" width="12" height="6" rx="2.5" fill="#FFFFFF" fillOpacity="0.12" stroke={primaryDeep} strokeWidth="1.2" />

            {/* ── 3. Cylinder Shoulder / Top Dome ── */}
            <path
              d="M 12 56 C 12 36 28 32 50 32 C 72 32 88 36 88 56 Z"
              fill={`url(#cylGrad_${color})`}
            />

            {/* ── 4. Upper Weld Ring Seam ── */}
            <path
              d="M 11 57 Q 50 60 89 57"
              stroke={primaryDeep}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 11 58.5 Q 50 61.5 89 58.5"
              stroke={highlight}
              strokeWidth="1"
              strokeOpacity="0.6"
              fill="none"
              strokeLinecap="round"
            />

            {/* ── 5. Main Cylinder Barrel Body ── */}
            <rect
              x="12"
              y="57"
              width="76"
              height="80"
              fill={`url(#cylGrad_${color})`}
            />

            {/* Central Embossed Emblem / Ring Banner */}
            <rect
              x="18"
              y="86"
              width="64"
              height="22"
              rx="4"
              fill="#000000"
              fillOpacity="0.16"
              stroke={highlight}
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
            {/* Flame Icon on Cylinder Front */}
            <path
              d="M 50 90 C 47 95 44 97 44 101 C 44 104 47 106 50 106 C 53 106 56 104 56 101 C 56 97 53 95 50 90 Z"
              fill="#FDE047"
            />
            <path
              d="M 50 95 C 48.5 98 47 99 47 101.5 C 47 103 48.5 104.5 50 104.5 C 51.5 104.5 53 103 53 101.5 C 53 99 51.5 98 50 95 Z"
              fill="#F97316"
            />

            {/* Dynamic Light Shimmer Sweep across the barrel */}
            <g clipPath="url(#bodyClip)">
              <rect
                x="-80"
                y="57"
                width="40"
                height="80"
                fill={`url(#shimmerGrad_${color})`}
                className="animate-cylinder-shimmer"
                transform="skewX(-20)"
              />
            </g>
            <clipPath id="bodyClip">
              <rect x="12" y="57" width="76" height="80" />
            </clipPath>

            {/* ── 6. Lower Weld Ring Seam ── */}
            <path
              d="M 11 137 Q 50 140 89 137"
              stroke={primaryDeep}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 11 138.5 Q 50 141.5 89 138.5"
              stroke={highlight}
              strokeWidth="1"
              strokeOpacity="0.6"
              fill="none"
              strokeLinecap="round"
            />

            {/* ── 7. Cylinder Bottom Dome ── */}
            <path
              d="M 12 137 C 12 152 28 156 50 156 C 72 156 88 152 88 137 Z"
              fill={`url(#cylGrad_${color})`}
            />

            {/* ── 8. Foot Ring Stand ── */}
            <path
              d="M 22 148 L 20 167 C 20 170 30 172 50 172 C 70 172 80 170 80 167 L 78 148 Z"
              fill={`url(#baseGrad_${color})`}
              stroke={primaryDeep}
              strokeWidth="1"
            />
            {/* Foot ring vent holes */}
            <ellipse cx="34" cy="165" rx="5" ry="2.5" fill="#000000" fillOpacity="0.4" />
            <ellipse cx="50" cy="166" rx="6" ry="2.5" fill="#000000" fillOpacity="0.4" />
            <ellipse cx="66" cy="165" rx="5" ry="2.5" fill="#000000" fillOpacity="0.4" />
          </svg>
        </div>

        {/* ── Floor Shadow underneath (synchronized bounce) ── */}
        <div
          className="mt-1 rounded-full bg-slate-900/30 dark:bg-black/60 blur-[3px] animate-cylinder-shadow"
          style={{
            width: conf.shadowWidth,
            height: conf.shadowHeight,
          }}
        />
      </div>

      {/* ── Optional Message & Subtitle ── */}
      {(message || subtitle) && (
        <div className="mt-4 flex flex-col items-center text-center max-w-xs px-3">
          {message && (
            <p className={`${conf.textClass} text-slate-800 dark:text-slate-100 flex items-center gap-1.5`}>
              <span>{message}</span>
              <span className="inline-flex tracking-widest text-primary font-bold">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </p>
          )}
          {subtitle && (
            <p className={`${conf.subClass} text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300">
        <div className="p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/10 flex flex-col items-center justify-center">
          {loaderBody}
        </div>
      </div>
    );
  }

  return loaderBody;
}
