"use client";

import { ErrorPageShell } from "@/components/ui/ErrorPageShell";
import { ShieldAlert, LogIn, ArrowRight, ShieldX, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <ErrorPageShell
      iconBg="linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)"
      iconBorder="1px solid #fdba74"
      iconColor="#ea580c"
      icon={<ShieldX className="w-10 h-10" />}
      pingColor="rgba(234, 88, 12, 0.07)"
      badgeBg="#fff7ed"
      badgeBorder="1px solid #fed7aa"
      badgeColor="#c2410c"
      badgeIcon={<ShieldAlert className="w-3 h-3" />}
      badgeLabel="Access Denied — 403"
      heading="Unauthorized Access"
      body="Your account role does not have permission to view this page. If you think this is a mistake, please contact your system administrator."
      primaryHref="/login"
      primaryLabel="Sign in with another account"
      primaryIcon={<LogIn className="w-4 h-4" />}
      secondaryHref="/"
      secondaryLabel="Back to Home"
      secondaryIcon={<Home className="w-4 h-4" />}
      infoBg="#fef2f2"
      infoBorder="1px solid #fecaca"
      infoIcon={<ShieldAlert className="w-4 h-4" />}
      infoIconColor="#dc2626"
      infoTitle="Security Policy Enforcement"
      infoBody="Our platform strictly enforces role-based access control. All access attempts are logged for security auditing."
      footerNote="© 2026 GasAgency Enterprise Platform · Unauthorized Access"
    />
  );
}
