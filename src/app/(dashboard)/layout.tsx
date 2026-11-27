"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SessionGuard } from "@/components/layout/SessionGuard";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CylinderLoader } from "@/components/ui/CylinderLoader";
import { Footer } from "@/components/layout/Footer";
import { NotificationToast } from "@/components/layout/NotificationToast";
import { NotificationFab } from "@/components/layout/NotificationFab";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <CylinderLoader
          size="lg"
          color="red"
          message="Starting Your Session"
          subtitle="Connecting to Gas Agency Portal..."
        />
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

      {/* WhatsApp-style live in-app notification popups + sound */}
      <NotificationToast />

      {/* Floating chatbot-style notification button with unread badge & arrival highlight */}
      <NotificationFab />

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
        className={`transition-all duration-200 ${collapsed ? "ml-0 md:ml-[52px]" : "ml-0 md:ml-[220px]"} min-h-screen flex flex-col justify-between`}
        style={{
          paddingTop: "var(--app-header-height, 52px)",
        }}
      >
        <div className="p-2.5 sm:p-5 lg:p-6 animate-fade-up flex-1">
          {children}
        </div>
        <Footer className="pb-[calc(var(--app-bottom-nav-height,60px)+8px)] md:pb-4" />
      </main>

      {/* Touch-Friendly Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        role={session.role}
        onOpenMobileMenu={() => setMobileOpen(true)}
      />
    </div>
  );
}
