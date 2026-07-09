"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw, Flame, ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <title>Something went wrong — GasAgency</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>

          {/* Navbar */}
          <nav style={{ height: 56, background: "#ffffff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 40 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flame size={16} color="#fff" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#18181b" }}>GasAgency</span>
            </a>
            <a href="/" style={{ fontSize: 13, fontWeight: 500, color: "#2563eb", border: "1px solid #bfdbfe", background: "#eff6ff", padding: "6px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Home size={14} /> Home
            </a>
          </nav>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
            <div style={{ width: "100%", maxWidth: 512 }}>

              {/* Icon */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
                <div style={{ position: "relative", width: 96, height: 96, borderRadius: 16, background: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)", border: "1px solid #f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={40} color="#dc2626" />
                </div>
              </div>

              {/* Card */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32, marginBottom: 24, boxShadow: "0 4px 24px -4px rgba(15,23,42,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 12px", borderRadius: 999, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                    <ShieldAlert size={12} /> Critical Error
                  </span>
                </div>

                <h1 style={{ fontSize: 26, fontWeight: 700, textAlign: "center", color: "#18181b", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                  Something went wrong
                </h1>
                <p style={{ fontSize: 14, textAlign: "center", color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
                  An unexpected error occurred in the application. Our team has been notified. You can try refreshing or return to the home page.
                </p>

                {error.digest && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", marginBottom: 24, textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>Error ID: {error.digest}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={reset}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, background: "#2563eb", color: "#ffffff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
                  >
                    <RefreshCw size={16} /> Try again
                  </button>
                  <a
                    href="/"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontWeight: 500, fontSize: 14, background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0", textDecoration: "none" }}
                  >
                    <Home size={16} /> Back to home
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "16px 20px" }}>
                <AlertTriangle size={16} color="#c2410c" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "0 0 2px" }}>Your data is safe</p>
                  <p style={{ fontSize: 12, color: "#b45309", lineHeight: 1.6, margin: 0 }}>No changes were saved during this error. Refreshing the page will restore the last known good state.</p>
                </div>
              </div>

              <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#94a3b8" }}>
                © 2026 GasAgency Enterprise Platform · Critical Application Error
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
