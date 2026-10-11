"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Eye,
  Maximize2,
} from "lucide-react";
import { getPhotoDisplayUrl, getPhotoFullResUrl } from "@/lib/photo-utils";

interface PhotoPreviewModalProps {
  url: string | null;
  title?: string;
  subtitle?: string;
  isOpen?: boolean;
  onClose: () => void;
}

export function PhotoPreviewModal({
  url,
  title = "Delivery Proof Photo",
  subtitle,
  isOpen = true,
  onClose,
}: PhotoPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset viewport state when URL changes
  useEffect(() => {
    if (url) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setLoading(true);
      setError(false);
    }
  }, [url]);

  // Lock body scroll and prevent background page movement while modal is open
  useEffect(() => {
    if (!url || !isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [url, isOpen]);

  // Keyboard shortcut support
  useEffect(() => {
    if (!url || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === "r") {
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [url, isOpen, onClose]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Double click toggles 1x and 2x zoom
  const handleDoubleClick = () => {
    if (zoom > 1.2) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.15, 4));
    } else {
      setZoom((prev) => Math.max(prev - 0.15, 0.5));
    }
  };

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!mounted || !url || !isOpen) return null;

  const displayUrl = getPhotoDisplayUrl(url);
  const fullResUrl = getPhotoFullResUrl(url);
  const isS3Source = url.includes("amazonaws.com") || url.startsWith("agencies/");

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-150 overflow-hidden"
      style={{
        overscrollBehavior: "contain",
        touchAction: "none",
      }}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
      onClick={onClose}
    >
      {/* ── Fixed Top Header Bar (Always visible at the top of the viewport) ── */}
      <div
        className="h-14 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
              {isS3Source && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> AWS S3 Secured
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {subtitle || "Inspect delivery proof at full resolution. Double-click or scroll to zoom."}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom Out (-)"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Zoom (0)"
              className="px-2 py-1 text-xs font-mono text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              title="Zoom In (+)"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90° (R)"
            className="p-2 rounded-lg bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reset View Button */}
          {(zoom !== 1 || rotation !== 0 || pan.x !== 0 || pan.y !== 0) && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset View (0)"
              className="hidden sm:inline-flex p-2 rounded-lg bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {/* Direct Download */}
          <a
            href={`${displayUrl}&download=1`}
            download="delivery-proof.jpg"
            title="Download Original Photo"
            className="hidden sm:inline-flex p-2 rounded-lg bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Open Pre-signed Full Res in new tab */}
          <a
            href={fullResUrl}
            target="_blank"
            rel="noreferrer"
            title="Open full resolution pre-signed image in new tab"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span className="hidden sm:inline">Open Full Res</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close viewer (Esc)"
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800/90 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main Photo Canvas (Takes remaining viewport space with proper bounding) ── */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => e.stopPropagation()}
        className={`flex-1 min-h-0 min-w-0 relative overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-slate-950 ${
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
      >
        {/* Subtle grid pattern backdrop */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Loading State */}
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium text-slate-300">
              Loading high-resolution proof from secure storage...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 max-w-sm text-center z-10">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Unable to preview image</p>
            <p className="text-xs text-slate-400">
              The photo could not be rendered inline. You can try opening the direct full resolution link.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setLoading(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
              <a
                href={fullResUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold flex items-center gap-1.5"
              >
                Open Direct Link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Rendered Image — cleanly constrained to fit within canvas bounds at 100% zoom */}
        {!error && (
          <img
            src={displayUrl}
            alt={title}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 150ms ease-out",
              maxHeight: "100%",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
            className="select-none rounded-lg shadow-2xl transition-opacity duration-200 pointer-events-auto"
          />
        )}
      </div>

      {/* ── Fixed Bottom Helper Bar (Always visible at the bottom of the viewport) ── */}
      <div
        className="h-10 px-4 sm:px-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden sm:inline">
            Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">+</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">-</kbd> Zoom · <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">R</kbd> Rotate · <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">0</kbd> Reset · <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> Close
          </span>
          <span className="sm:hidden">
            Scroll or pinch to zoom · Drag to pan · Double-tap for 2x
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {Math.round(zoom * 100)}%
            {rotation !== 0 && ` · ${rotation}°`}
          </span>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium underline"
            >
              Reset Fit
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
