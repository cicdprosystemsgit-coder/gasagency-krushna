"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, Settings,
  PanelLeftClose, PanelLeft, LogOut, ShieldCheck, PhoneCall, CreditCard,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV: NavItem[] = [
  { label: "Dashboard",       href: "/system-admin",                   icon: LayoutDashboard },
  { label: "Agencies",        href: "/system-admin/agencies",          icon: Building2 },
  { label: "Demo Requests",   href: "/system-admin/demo-requests",     icon: PhoneCall },
  { label: "Subscriptions",   href: "/subscriptions",                  icon: CreditCard },
  { label: "All Users",       href: "/system-admin/users",             icon: Users },
  { label: "Settings",        href: "/system-admin/settings",          icon: Settings },
];

export function SystemAdminSidebar({ name, newDemoCount = 0 }: { name: string; newDemoCount?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const w = collapsed ? 52 : 220;

  // Inject live badge for demo requests
  const navWithBadges = NAV.map((item) =>
    item.href === "/system-admin/demo-requests" && newDemoCount > 0
      ? { ...item, badge: newDemoCount }
      : item
  );

  return (
    <aside
      style={{
        width: w, minWidth: w, maxWidth: w,
        background: "#0F172A",
        borderRight: "1px solid #1E293B",
        display: "flex", flexDirection: "column",
        height: "100vh", position: "sticky", top: 0,
        transition: "width 0.18s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        height: 52, display: "flex", alignItems: "center",
        padding: collapsed ? "0 10px" : "0 14px",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: "1px solid #1E293B", flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <ShieldCheck style={{ width: 13, height: 13, color: "#fff" }} />
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.02em", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                GasAdmin
              </p>
              <p style={{ fontSize: 10, color: "#475569", lineHeight: 1 }}>Platform Control</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck style={{ width: 13, height: 13, color: "#fff" }} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 4, borderRadius: 4 }}
          >
            <PanelLeftClose style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
        {navWithBadges.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/system-admin"
            ? pathname === "/system-admin"
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex", alignItems: "center",
                gap: 8, padding: "6px 8px", borderRadius: 6,
                marginBottom: 1,
                fontSize: 13, fontWeight: 500,
                color: active ? "#E2E8F0" : "#64748B",
                background: active ? "#1E293B" : "transparent",
                textDecoration: "none",
                transition: "background 0.12s, color 0.12s",
                whiteSpace: "nowrap", overflow: "hidden",
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
              }}
            >
              <Icon style={{
                width: 15, height: 15, flexShrink: 0,
                color: active ? "#6366F1" : "#475569",
              }} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge != null && badge > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: "#2563EB", color: "#fff",
                      padding: "1px 6px", borderRadius: 999, lineHeight: 1.6,
                    }}>
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge != null && badge > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#2563EB",
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1E293B", padding: "8px 6px", flexShrink: 0 }}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: "#475569", borderRadius: 6 }}
          >
            <PanelLeft style={{ width: 14, height: 14 }} />
          </button>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                <p style={{ fontSize: 10, color: "#475569" }}>System Admin</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button type="submit" style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "6px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                color: "#64748B", background: "none", border: "none", cursor: "pointer",
                transition: "color 0.12s",
              }}>
                <LogOut style={{ width: 13, height: 13 }} />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
