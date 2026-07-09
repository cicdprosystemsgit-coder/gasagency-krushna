"use client";

import { ErrorPageShell } from "@/components/ui/ErrorPageShell";
import { WifiOff, AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <ErrorPageShell
      iconBg="linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
      iconBorder="1px solid #cbd5e1"
      iconColor="#475569"
      icon={<WifiOff className="w-10 h-10" />}
      pingColor="rgba(71, 85, 105, 0.07)"
      badgeBg="#f1f5f9"
      badgeBorder="1px solid #cbd5e1"
      badgeColor="#334155"
      badgeIcon={<WifiOff className="w-3 h-3" />}
      badgeLabel="Network Connection Offline"
      heading="You are offline"
      body="We couldn't connect to the server. Please check your internet connection and try reloading the page."
      primaryOnClick={handleRetry}
      primaryLabel="Try reloading"
      primaryIcon={<RefreshCw className="w-4 h-4" />}
      secondaryHref="/"
      secondaryLabel="Back to Home"
      secondaryIcon={<Home className="w-4 h-4" />}
      infoBg="#f8fafc"
      infoBorder="1px solid #cbd5e1"
      infoIcon={<AlertTriangle className="w-4 h-4" />}
      infoIconColor="#475569"
      infoTitle="Offline Mode"
      infoBody="Some pages you visited before going offline might still load using cached data. New submissions will require connection."
      footerNote="© 2026 GasAgency Enterprise Platform · Offline Capability"
    />
  );
}
