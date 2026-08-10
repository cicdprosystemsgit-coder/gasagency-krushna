"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Truck,
  Users,
  BarChart3,
  Menu,
  Boxes,
  Warehouse,
  Receipt,
  Banknote,
  Package,
} from "lucide-react";

interface MobileBottomNavProps {
  role: string;
  onOpenMobileMenu: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function MobileBottomNav({ role, onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const getBase = (r: string) => {
    const map: Record<string, string> = {
      ADMIN: "/admin",
      MANAGER: "/manager",
      GODOWN_KEEPER: "/godown-keeper",
      STAFF: "/staff",
      DELIVERY_BOY: "/delivery-boy",
    };
    return map[r] ?? "/";
  };

  const base = getBase(role);

  const getPrimaryItems = (): NavItem[] => {
    if (role === "ADMIN" || role === "MANAGER") {
      return [
        { label: "Home", href: base, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Deliveries", href: `${base}/delivery-plan`, icon: <Truck className="w-5 h-5" /> },
        { label: "Customers", href: `${base}/customer-management`, icon: <Users className="w-5 h-5" /> },
        { label: "Expenses", href: `${base}/expenses`, icon: <BarChart3 className="w-5 h-5" /> },
      ];
    }
    if (role === "DELIVERY_BOY") {
      return [
        { label: "Home", href: base, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Deliveries", href: `${base}/my-deliveries`, icon: <Truck className="w-5 h-5" /> },
        { label: "Ledger", href: `${base}/delivery-ledger`, icon: <Package className="w-5 h-5" /> },
        { label: "Closing", href: `${base}/daily-closing`, icon: <Receipt className="w-5 h-5" /> },
      ];
    }
    if (role === "GODOWN_KEEPER") {
      return [
        { label: "Home", href: base, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Godown", href: `${base}/godown`, icon: <Warehouse className="w-5 h-5" /> },
        { label: "Inventory", href: `${base}/inventory`, icon: <Boxes className="w-5 h-5" /> },
        { label: "Salary", href: `${base}/my-salary`, icon: <Banknote className="w-5 h-5" /> },
      ];
    }
    if (role === "STAFF") {
      return [
        { label: "Home", href: base, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Customers", href: `${base}/customer-management`, icon: <Users className="w-5 h-5" /> },
        { label: "Txns", href: `${base}/office-transactions`, icon: <Receipt className="w-5 h-5" /> },
        { label: "Stock", href: `${base}/inventory`, icon: <Boxes className="w-5 h-5" /> },
      ];
    }

    return [{ label: "Home", href: base, icon: <LayoutDashboard className="w-5 h-5" /> }];
  };

  const primaryItems = getPrimaryItems();

  return (
    <div className="md:hidden mobile-bottom-nav flex items-center justify-around px-1 z-40">
      {primaryItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== base && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 text-[11px] font-medium transition-colors cursor-pointer",
              isActive
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <div className={cn("p-1 rounded-full", isActive && "bg-blue-50 dark:bg-blue-950/40")}>
              {item.icon}
            </div>
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu Drawer Trigger */}
      <button
        onClick={onOpenMobileMenu}
        type="button"
        className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
      >
        <div className="p-1 rounded-full">
          <Menu className="w-5 h-5" />
        </div>
        <span className="leading-none">Menu</span>
      </button>
    </div>
  );
}
