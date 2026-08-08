"use client";

import { LogOut, AlertTriangle, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface NavbarProps {
  userName: string;
  role: string;
  renewalAlerts?: number;
  sidebarCollapsed: boolean;
  onOpenMobileMenu?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager",
  GODOWN_KEEPER: "Godown Keeper", STAFF: "Staff", DELIVERY_BOY: "Delivery Boy",
};

export function Navbar({ userName, role, renewalAlerts = 0, sidebarCollapsed, onOpenMobileMenu }: NavbarProps) {
  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center h-[52px] transition-all duration-200 left-0 md:left-[220px]"
      style={{
        left: typeof window !== "undefined" && window.innerWidth < 768 ? 0 : (sidebarCollapsed ? 52 : 220),
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        padding: "0 12px",
      }}
    >
      {/* Mobile Menu Trigger */}
      {onOpenMobileMenu && (
        <button
          onClick={onOpenMobileMenu}
          type="button"
          aria-label="Open mobile menu"
          className="md:hidden flex items-center justify-center w-8 h-8 mr-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Live Global Search */}
      <div className="flex-1 max-w-md">
        <GlobalSearch />
      </div>


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

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Real Notification Bell */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: "var(--color-border)" }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right">
            <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-none">{userName}</p>
            <p className="text-[11px] mt-0.5 leading-none" style={{ color: "var(--color-text-secondary)" }}>{ROLE_LABELS[role] || role}</p>
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

