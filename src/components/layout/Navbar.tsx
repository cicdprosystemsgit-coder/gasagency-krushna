"use client";

import { LogOut, AlertTriangle, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SecuritySettingsModal } from "@/components/auth/SecuritySettingsModal";

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
      className={cn(
        "fixed top-0 right-0 z-30 transition-all duration-200 left-0 app-header",
        sidebarCollapsed ? "md:left-[52px]" : "md:left-[220px]"
      )}
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center w-full h-14 md:h-[52px] px-2.5 sm:px-3">
        {/* Mobile Menu Trigger */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            type="button"
            aria-label="Open mobile menu"
            className="md:hidden flex items-center justify-center w-8 h-8 mr-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Live Global Search */}
        <div className="flex-1 max-w-md min-w-0 mr-1 sm:mr-0">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
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

          {/* Security & 2-Step Verification Modal for all roles (desktop) */}
          <div className="hidden sm:block">
            <SecuritySettingsModal userName={userName} role={role} />
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 mx-1" style={{ background: "var(--color-border)" }} />

          {/* User Profile Link */}
          {(() => {
            const profileHref = `/${role.toLowerCase().replace(/_/g, "-")}/profile`;
            return (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href={profileHref}
                  title="View My Profile"
                  className="flex items-center gap-2 py-1 px-1 sm:px-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 group-hover:ring-blue-500/50 transition-all shrink-0">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[120px]">
                      {userName}
                    </p>
                    <p className="text-[10px] mt-0.5 leading-none" style={{ color: "var(--color-text-secondary)" }}>
                      {ROLE_LABELS[role] || role}
                    </p>
                  </div>
                </Link>
                <form action={logoutAction} className="hidden sm:block">
                  <button
                    type="submit"
                    title="Sign out"
                    className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            );
          })()}
        </div>
      </div>
    </header>
  );
}

