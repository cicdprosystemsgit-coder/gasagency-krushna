"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

interface SessionData {
  name: string;
  role: string;
  enabledFeatures: string[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => setSession(d))
      .catch(() => {});
  }, []);

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

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: "var(--color-bg)" }}>
      <Sidebar
        role={session.role}
        userName={session.name}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        enabledFeatures={session.enabledFeatures ?? []}
      />
      <Navbar
        userName={session.name}
        role={session.role}
        sidebarCollapsed={collapsed}
      />
      <main
        className="transition-all duration-200"
        style={{
          marginLeft: collapsed ? 52 : 220,
          paddingTop: 52,
        }}
      >
        <div className="p-6 animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
