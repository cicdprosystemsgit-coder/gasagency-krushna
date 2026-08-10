"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SessionGuard } from "@/components/layout/SessionGuard";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

interface SessionData {
  name: string;
  role: string;
  enabledFeatures: string[];
  themeColor?: string;
  logoBase64?: string | null;
  agencyName?: string | null;
  customRole?: string | null;
  customRoleId?: string | null;
  customRolePermissions?: { resource: string; action: string; isAllowed: boolean }[];
}

function adjustColorBrightness(hex: string, percent: number) {
  const rawHex = hex.replace(/^\s*#|\s*$/g, "");
  let R = parseInt(rawHex.substring(0, 2), 16);
  let G = parseInt(rawHex.substring(2, 4), 16);
  let B = parseInt(rawHex.substring(4, 6), 16);

  R = Math.max(0, Math.min(255, R + (percent * 2.55)));
  G = Math.max(0, Math.min(255, G + (percent * 2.55)));
  B = Math.max(0, Math.min(255, B + (percent * 2.55)));

  const rHex = Math.round(R).toString(16).padStart(2, "0");
  const gHex = Math.round(G).toString(16).padStart(2, "0");
  const bHex = Math.round(B).toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/session")
      .then((r) => {
        if (r.status === 401) {
          // Session already expired server-side — redirect to info page
          router.replace("/session-expired?reason=inactivity");
          return null;
        }
        return r.json();
      })
      .then((d) => { if (d) setSession(d); })
      .catch(() => {});
  }, [router]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
          />
          Loading…
        </div>
      </div>
    );
  }

  // Calculate dynamic theme styles based on agency's primary color
  const themeColor = session.themeColor || "#2563eb";
  const themeStyles = {
    "--color-primary": themeColor,
    "--color-primary-hover": adjustColorBrightness(themeColor, -12),
    "--color-primary-light": `${themeColor}12`, // ~7% opacity
    "--color-primary-muted": `${themeColor}22`, // ~13% opacity
    "--color-sidebar-text-active": themeColor,
    "--color-sidebar-active": `${themeColor}12`,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen animate-fade-in"
      style={{
        background: "var(--color-bg)",
        ...themeStyles,
      }}
    >
      {/* 6-hour inactivity session guard — invisible, purely behavioral */}
      <SessionGuard />

      <Sidebar
        role={session.role}
        userName={session.name}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        enabledFeatures={session.enabledFeatures ?? []}
        agencyName={session.agencyName}
        logoBase64={session.logoBase64}
        customRoleName={session.customRole}
        customRolePermissions={session.customRolePermissions}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Navbar
        userName={session.name}
        role={session.role}
        sidebarCollapsed={collapsed}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />

      <main
        className="transition-all duration-200 ml-0 md:ml-[220px]"
        style={{
          paddingTop: 52,
        }}
      >
        <div className="p-3.5 sm:p-5 lg:p-6 pb-20 md:pb-6 animate-fade-up">{children}</div>
      </main>

      {/* Touch-Friendly Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        role={session.role}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />
    </div>
  );
}
