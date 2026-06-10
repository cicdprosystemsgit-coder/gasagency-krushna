"use client";

import { LogOut, AlertTriangle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/ui/GlobalSearch";

interface NavbarProps {
  userName: string;
  role: string;
  renewalAlerts?: number;
  sidebarCollapsed: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager",
  GODOWN_KEEPER: "Godown Keeper", STAFF: "Staff", DELIVERY_BOY: "Delivery Boy",
};

export function Navbar({ userName, role, renewalAlerts = 0, sidebarCollapsed }: NavbarProps) {
  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center h-[52px] transition-all duration-200"
      style={{
        left: sidebarCollapsed ? 52 : 220,
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        padding: "0 20px",
      }}
    >
      {/* Live Global Search */}
      <GlobalSearch />


      <div className="ml-auto flex items-center gap-1.5">

        {/* Renewal alert chip */}
        {renewalAlerts > 0 && (
          <Link
            href="/admin/vehicle-management"
            className="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}
          >
            <AlertTriangle className="w-3 h-3" />
            {renewalAlerts} renewal{renewalAlerts > 1 ? "s" : ""} due
          </Link>
        )}

        {/* Real Notification Bell */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: "var(--color-border)" }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right">
            <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-none">{userName}</p>
            <p className="text-[11px] mt-0.5 leading-none" style={{ color: "var(--color-text-secondary)" }}>{ROLE_LABELS[role]}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-600 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
