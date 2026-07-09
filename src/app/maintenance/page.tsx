"use client";

import { ErrorPageShell } from "@/components/ui/ErrorPageShell";
import { Wrench, ShieldAlert, Home, LogIn } from "lucide-react";

export default function MaintenancePage() {
  return (
    <ErrorPageShell
      iconBg="linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)"
      iconBorder="1px solid #c084fc"
      iconColor="#7c3aed"
      icon={<Wrench className="w-10 h-10" />}
      pingColor="rgba(124, 58, 237, 0.07)"
      badgeBg="#f5f3ff"
      badgeBorder="1px solid #ddd6fe"
      badgeColor="#6d28d9"
      badgeIcon={<ShieldAlert className="w-3 h-3" />}
      badgeLabel="Account Status — Suspended"
      heading="Agency Account Inactive"
      body="The GasAgency account associated with your user is currently inactive or suspended. This might be due to pending billing cycles or administrative maintenance."
      primaryHref="/login"
      primaryLabel="Try another account"
      primaryIcon={<LogIn className="w-4 h-4" />}
      secondaryHref="/"
      secondaryLabel="Back to Home"
      secondaryIcon={<Home className="w-4 h-4" />}
      infoBg="#fff7ed"
      infoBorder="1px solid #fed7aa"
      infoIcon={<ShieldAlert className="w-4 h-4" />}
      infoIconColor="#c2410c"
      infoTitle="Administrative Notice"
      infoBody="Please contact the agency owner or system administration support to resolve this issue and reactivate the account."
      footerNote="© 2026 GasAgency Enterprise Platform · Maintenance and Billing"
    />
  );
}
