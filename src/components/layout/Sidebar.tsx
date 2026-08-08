"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, BookOpen,
  Receipt, Wallet, Users, ClipboardCheck, FileText, Truck,
  BarChart3, PanelLeftClose, PanelLeft, Flame, Boxes, CreditCard,
  Banknote, CalendarDays, Car, TrendingUp, Clock, FolderOpen, MessageSquarePlus,
  ShieldCheck, Building2, KeyRound, FileDown, Palette, BadgeDollarSign, PieChart,
  Activity, ArrowRightLeft, Layers, Percent, X,
} from "lucide-react";


interface SidebarProps {
  role: string;
  userName: string;
  collapsed: boolean;
  onToggle: () => void;
  enabledFeatures?: string[];
  agencyName?: string | null;
  logoBase64?: string | null;
  customRoleName?: string | null;
  customRolePermissions?: { resource: string; action: string; isAllowed: boolean }[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  featureKey?: string; // if set, hidden when not in enabledFeatures (unless enabledFeatures is empty)
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const RESOURCE_TO_NAV: Record<string, { section: string; label: string; href: string; icon: React.ReactNode }> = {
  customers:        { section: "Accounts",    label: "Customer Management", href: "/customer-management", icon: <Users className="w-4 h-4" /> },
  inventory:        { section: "Operations",  label: "Office Stock",        href: "/inventory",           icon: <Boxes className="w-4 h-4" /> },
  godown:           { section: "Operations",  label: "Godown",              href: "/godown",              icon: <Warehouse className="w-4 h-4" /> },
  vehicles:         { section: "Operations",  label: "Vehicle Management",  href: "/vehicle-management",  icon: <Car className="w-4 h-4" /> },
  deliveries:       { section: "Operations",  label: "Delivery Plan",       href: "/delivery-plan",       icon: <Truck className="w-4 h-4" /> },
  transactions:     { section: "Accounts",    label: "Office Transactions", href: "/office-transactions", icon: <Receipt className="w-4 h-4" /> },
  gstInvoices:      { section: "Accounts",    label: "GST Invoicing",       href: "/gst-invoicing",       icon: <FileText className="w-4 h-4" /> },
  salaries:         { section: "Finance",     label: "Salaries & Drawings", href: "/salaries",            icon: <Wallet className="w-4 h-4" /> },
  expenses:         { section: "Finance",     label: "Expenses & Vehicles", href: "/expenses",            icon: <BarChart3 className="w-4 h-4" /> },
  leaves:           { section: "People",      label: "Leave Management",    href: "/leave-management",    icon: <CalendarDays className="w-4 h-4" /> },
  paymentReceipts:  { section: "Intelligence",label: "Payment Receipts",    href: "/payment-receipts",    icon: <Receipt className="w-4 h-4" /> },
  documents:        { section: "Intelligence",label: "Documents",           href: "/documents",           icon: <FolderOpen className="w-4 h-4" /> },
  complaints:       { section: "Intelligence",label: "Complaints",          href: "/complaints",          icon: <MessageSquarePlus className="w-4 h-4" /> },
  analytics:        { section: "Intelligence",label: "Analytics",           href: "/analytics",           icon: <TrendingUp className="w-4 h-4" /> },
  approvals:        { section: "People",      label: "Approvals",           href: "/approvals",           icon: <BookOpen className="w-4 h-4" /> },
  branches:         { section: "Enterprise",  label: "Branches",            href: "/branches",            icon: <Building2 className="w-4 h-4" /> },
};

function getCustomRoleNavSections(
  permissions: { resource: string; action: string; isAllowed: boolean }[],
  base: string
): NavSection[] {
  // Filter resources that have at least read allowed
  const allowedResources = new Set(
    permissions
      .filter((p) => p.action === "read" && p.isAllowed)
      .map((p) => p.resource)
  );

  const dashboard = { label: "Dashboard", href: base, icon: <LayoutDashboard className="w-4 h-4" /> };
  const sections: NavSection[] = [{ items: [dashboard] }];

  // Group by section
  const sectionGroups: Record<string, NavItem[]> = {};

  for (const resource of Array.from(allowedResources)) {
    const navItem = RESOURCE_TO_NAV[resource];
    if (navItem) {
      if (!sectionGroups[navItem.section]) {
        sectionGroups[navItem.section] = [];
      }
      sectionGroups[navItem.section].push({
        label: navItem.label,
        href: `${base}${navItem.href}`,
        icon: navItem.icon,
      });
    }
  }

  // Add the grouped sections
  const SECTION_ORDER = ["Operations", "Accounts", "Finance", "People", "Intelligence", "Enterprise"];
  for (const sectName of SECTION_ORDER) {
    const items = sectionGroups[sectName];
    if (items && items.length > 0) {
      sections.push({
        label: sectName,
        items,
      });
    }
  }

  // Always append personal account section
  sections.push({
    label: "My Account",
    items: [
      { label: "My Salary", href: `${base}/my-salary`, icon: <Banknote className="w-4 h-4" /> },
    ],
  });

  return sections;
}

function getNavSections(
  role: string,
  base: string,
  customRolePermissions?: { resource: string; action: string; isAllowed: boolean }[]
): NavSection[] {
  const dashboard = { label: "Dashboard", href: base, icon: <LayoutDashboard className="w-4 h-4" /> };

  if (customRolePermissions && customRolePermissions.length > 0) {
    return getCustomRoleNavSections(customRolePermissions, base);
  }

  if (role === "ADMIN" || role === "MANAGER") {
    const adminOnlySections = role === "ADMIN" ? [
      {
        label: "Personal Finance",
        items: [
          { label: "Finance Dashboard", href: `${base}/accounts/dashboard`, icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: "Personal Accounts", href: `${base}/accounts`,          icon: <Wallet className="w-4 h-4" /> },
          { label: "Agency Account",    href: `${base}/accounts/agency-account`, icon: <Activity className="w-4 h-4" /> },
          { label: "Fund Transfer",     href: `${base}/accounts/transfer`,       icon: <ArrowRightLeft className="w-4 h-4" /> },
          { label: "Tax & ITR Summary", href: `${base}/accounts/tax-summary`, icon: <Percent className="w-4 h-4" /> },
        ]
      }
    ] : [];

    return [
      { items: [dashboard] },
      ...adminOnlySections,
      {
        label: "Operations",
        items: [
          { label: "Inventory",         href: `${base}/inventory`,          icon: <Boxes className="w-4 h-4" />,       featureKey: "inventory"          },
          { label: "Godown",            href: `${base}/godown`,             icon: <Warehouse className="w-4 h-4" />,   featureKey: "godown"             },
          { label: "Vehicle Management",href: `${base}/vehicle-management`, icon: <Car className="w-4 h-4" />,        featureKey: "vehicle_management" },
          { label: "Delivery Plan",     href: `${base}/delivery-plan`,      icon: <Truck className="w-4 h-4" />,      featureKey: "delivery_plan"      },
        ],
      },
      {
        label: "Accounts",
        items: [
          { label: "Customer Management", href: `${base}/customer-management`, icon: <Users className="w-4 h-4" />,       featureKey: "customer_management" },
          { label: "Office Transactions", href: `${base}/office-transactions`, icon: <Receipt className="w-4 h-4" />,     featureKey: "office_transactions" },
          { label: "Commercial Sales",    href: `${base}/commercial-sales`,    icon: <ShoppingCart className="w-4 h-4" />,featureKey: "commercial_sales"    },
          { label: "Credit Ledger",       href: `${base}/credit-ledger`,       icon: <CreditCard className="w-4 h-4" />, featureKey: "credit_ledger"       },
          { label: "Regulator Ledger",    href: `${base}/regulators`,          icon: <ShieldCheck className="w-4 h-4" /> },
          { label: "GST Invoicing",       href: `${base}/gst-invoicing`,       icon: <FileText className="w-4 h-4" />,   featureKey: "gst_invoicing"       },
        ],
      },
      {
        label: "Finance",
        items: [
          { label: "Salaries & Drawings", href: `${base}/salaries`,           icon: <Wallet className="w-4 h-4" />,      featureKey: "salaries"           },
          { label: "My Salary",           href: `${base}/my-salary`,          icon: <Banknote className="w-4 h-4" /> },
          { label: "Expenses & Vehicles", href: `${base}/expenses`,           icon: <BarChart3 className="w-4 h-4" />,   featureKey: "expenses"           },
          { label: "Company Payments",    href: `${base}/company-payments`,   icon: <Building2 className="w-4 h-4" />,   featureKey: "company_payments"   },
          { label: "Assets Management",   href: `${base}/assets`,             icon: <PieChart className="w-4 h-4" />,    featureKey: "assets_management"  },
          { label: "Expense Categories",  href: `${base}/expense-categories`, icon: <TrendingUp className="w-4 h-4" />,  featureKey: "expense_categories" },
          { label: "Daily Closing",       href: `${base}/daily-closing`,      icon: <ClipboardCheck className="w-4 h-4" />, featureKey: "daily_closing"  },
        ],
      },
      {
        label: "People",
        items: [
          ...(role === "ADMIN" ? [{ label: "Staff Management", href: `${base}/staff-management`, icon: <Users className="w-4 h-4" />, featureKey: "staff_management" }] : []),
          { label: "Approvals",       href: `${base}/approvals`,       icon: <BookOpen className="w-4 h-4" />,    featureKey: "approvals"       },
          { label: "Leave Management",href: `${base}/leave-management`,icon: <CalendarDays className="w-4 h-4" />,featureKey: "leave_management"},
          { label: "Attendance",      href: `${base}/attendance`,      icon: <Clock className="w-4 h-4" />,       featureKey: "attendance"      },
        ],
      },
      {
        label: "Intelligence",
        items: [
          { label: "Analytics",        href: `${base}/analytics`,        icon: <TrendingUp className="w-4 h-4" />,     featureKey: "analytics"        },
          { label: "Payment Receipts", href: `${base}/payment-receipts`, icon: <Receipt className="w-4 h-4" />,       featureKey: "payment_receipts" },
          { label: "Documents",        href: `${base}/documents`,        icon: <FolderOpen className="w-4 h-4" />,    featureKey: "documents"        },
          { label: "Complaints",       href: `${base}/complaints`,       icon: <MessageSquarePlus className="w-4 h-4" />, featureKey: "complaints"  },
          { label: "Data Export",      href: `${base}/export`,           icon: <FileDown className="w-4 h-4" />,      featureKey: "export"           },
        ],
      },
      {
        label: "Enterprise",
        items: [
          { label: "Branches", href: `${base}/branches`, icon: <Building2 className="w-4 h-4" />, featureKey: "branches" },
          ...(role === "ADMIN" ? [
            { label: "Billing",        href: `${base}/billing`,  icon: <BadgeDollarSign className="w-4 h-4" /> },
            { label: "API Gateway",   href: `${base}/api-keys`, icon: <KeyRound className="w-4 h-4" />,   featureKey: "api_gateway" },
            { label: "Security / 2FA",href: `${base}/security`, icon: <ShieldCheck className="w-4 h-4" />,featureKey: "security"    },
            { label: "Branding Config",href: `${base}/settings`, icon: <Palette className="w-4 h-4" /> },
          ] : []),
        ],
      },
    ];
  }

  if (role === "GODOWN_KEEPER") {
    return [
      { items: [dashboard] },
      {
        label: "Operations",
        items: [
          { label: "Godown & Fleet", href: `${base}/godown`,     icon: <Warehouse className="w-4 h-4" />, featureKey: "godown"     },
          { label: "Inventory",      href: `${base}/inventory`,  icon: <Boxes className="w-4 h-4" />,     featureKey: "inventory"  },
        ],
      },
      {
        label: "My Account",
        items: [
          { label: "My Salary",       href: `${base}/my-salary`,       icon: <Banknote className="w-4 h-4" />    },
          { label: "My Attendance",   href: `${base}/my-attendance`,   icon: <Clock className="w-4 h-4" />       },
          { label: "Leave Management",href: `${base}/leave-management`, icon: <CalendarDays className="w-4 h-4" />, featureKey: "leave_management" },
        ],
      },
    ];
  }

  if (role === "STAFF") {
    return [
      { items: [dashboard] },
      {
        label: "Modules",
        items: [
          { label: "Customer Management", href: `${base}/customer-management`, icon: <Users className="w-4 h-4" />,        featureKey: "customer_management" },
          { label: "Office Transactions", href: `${base}/office-transactions`, icon: <Receipt className="w-4 h-4" />,      featureKey: "office_transactions" },
          { label: "Commercial Sales",    href: `${base}/commercial-sales`,    icon: <ShoppingCart className="w-4 h-4" />, featureKey: "commercial_sales"    },
          { label: "Credit Ledger",       href: `${base}/credit-ledger`,       icon: <CreditCard className="w-4 h-4" />,  featureKey: "credit_ledger"       },
          { label: "Regulator Ledger",    href: `${base}/regulators`,          icon: <ShieldCheck className="w-4 h-4" /> },
          { label: "GST Invoicing",       href: `${base}/gst-invoicing`,       icon: <FileText className="w-4 h-4" />,    featureKey: "gst_invoicing"       },
          { label: "Office Stock",        href: `${base}/inventory`,           icon: <Boxes className="w-4 h-4" />,       featureKey: "inventory"           },
        ],
      },
      {
        label: "My Account",
        items: [
          { label: "My Salary",        href: `${base}/my-salary`,        icon: <Banknote className="w-4 h-4" />  },
          { label: "My Attendance",    href: `${base}/my-attendance`,    icon: <Clock className="w-4 h-4" />     },
          { label: "Leave Management", href: `${base}/leave-management`, icon: <CalendarDays className="w-4 h-4" />, featureKey: "leave_management" },
          { label: "Payment Receipts", href: `${base}/payment-receipts`, icon: <Receipt className="w-4 h-4" />,     featureKey: "payment_receipts" },
        ],
      },
    ];
  }

  if (role === "DELIVERY_BOY") {
    return [
      { items: [dashboard] },
      {
        label: "Deliveries",
        items: [
          { label: "My Deliveries",  href: `${base}/my-deliveries`,  icon: <Truck className="w-4 h-4" />   },
          { label: "Delivery Ledger",href: `${base}/delivery-ledger`,icon: <Package className="w-4 h-4" /> },
          { label: "Daily Closing",  href: `${base}/daily-closing`,  icon: <ClipboardCheck className="w-4 h-4" /> },
          { label: "Credit Ledger",  href: `${base}/credit-ledger`,  icon: <CreditCard className="w-4 h-4" />, featureKey: "credit_ledger" },
        ],
      },
      {
        label: "My Account",
        items: [
          { label: "My Salary",       href: `${base}/my-salary`,       icon: <Banknote className="w-4 h-4" />    },
          { label: "My Attendance",   href: `${base}/my-attendance`,   icon: <Clock className="w-4 h-4" />       },
          { label: "Leave Management",href: `${base}/leave-management`, icon: <CalendarDays className="w-4 h-4" />, featureKey: "leave_management" },
        ],
      },
    ];
  }

  return [{ items: [dashboard] }];
}

function filterSections(sections: NavSection[], enabledFeatures: string[]): NavSection[] {
  // Empty array = all features enabled (backward compat for old agencies)
  if (enabledFeatures.length === 0) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.featureKey || enabledFeatures.includes(item.featureKey)
      ),
    }))
    .filter((section) => section.items.length > 0);
}

function getBase(role: string) {
  const map: Record<string, string> = {
    ADMIN: "/admin", MANAGER: "/manager",
    GODOWN_KEEPER: "/godown-keeper", STAFF: "/staff", DELIVERY_BOY: "/delivery-boy",
  };
  return map[role] ?? "/";
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager",
  GODOWN_KEEPER: "Godown Keeper", STAFF: "Staff", DELIVERY_BOY: "Delivery Boy",
};

export function Sidebar({
  role,
  userName,
  collapsed,
  onToggle,
  enabledFeatures = [],
  agencyName,
  logoBase64,
  customRoleName,
  customRolePermissions = [],
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const base = getBase(role);
  const sections = filterSections(getNavSections(role, base, customRolePermissions), enabledFeatures);
  const t = useTranslations();

  const getTranslationKey = (label: string): string => {
    const map: Record<string, string> = {
      "Dashboard": "dashboard",
      "Inventory": "inventory",
      "Godown": "godown",
      "Godown & Fleet": "godown",
      "Vehicle Management": "vehicle_management",
      "Delivery Plan": "delivery_plan",
      "Customer Management": "customer_management",
      "Office Transactions": "office_transactions",
      "Commercial Sales": "commercial_sales",
      "Credit Ledger": "credit_ledger",
      "GST Invoicing": "gst_invoicing",
      "Salaries & Drawings": "salaries",
      "My Salary": "my_salary",
      "My Attendance": "my_attendance",
      "Expenses & Vehicles": "expenses",
      "Company Payments": "company_payments",
      "Assets Management": "assets_management",
      "Expense Categories": "expense_categories",
      "Daily Closing": "daily_closing",
      "Staff Management": "staff_management",
      "Approvals": "approvals",
      "Leave Management": "leave_management",
      "Attendance": "attendance",
      "Analytics": "analytics",
      "Payment Receipts": "payment_receipts",
      "Documents": "documents",
      "Complaints": "complaints",
      "Data Export": "export",
      "Branches": "branches",
      "Billing": "billing",
      "API Gateway": "api_gateway",
      "Security / 2FA": "security",
      "Branding Config": "settings",
      "My Deliveries": "my_deliveries",
      "Delivery Ledger": "delivery_ledger",
      "Office Stock": "inventory",
      "Operations": "operations",
      "Accounts": "accounts",
      "Finance": "finance",
      "People": "people",
      "Intelligence": "intelligence",
      "Enterprise": "enterprise",
      "Deliveries": "deliveries",
      "My Account": "myAccount",
      "Modules": "modules",
      "Personal Finance": "personal_finance",
      "Finance Dashboard": "finance_dashboard",
      "Personal Accounts": "personal_accounts",
      "Agency Account": "agency_account",
      "Fund Transfer": "fund_transfer",
    };
    return map[label] || label;
  };

  return (
    <>
      {/* Mobile Off-Canvas Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        />
      )}

      {/* Sidebar: Desktop Fixed + Mobile Off-Canvas Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200",
          // Mobile state: slide drawer, Desktop state: static sidebar
          mobileOpen ? "flex w-[260px]" : "hidden md:flex"
        )}
        style={{
          width: mobileOpen ? 260 : (collapsed ? 52 : 220),
          background: "var(--color-sidebar)",
          borderRight: "1px solid var(--color-sidebar-border)",
        }}
      >
        {/* Logo Header */}
        <div
          className="flex items-center justify-between h-[52px] flex-shrink-0"
          style={{ padding: collapsed && !mobileOpen ? "0 14px" : "0 16px", borderBottom: "1px solid var(--color-sidebar-border)" }}
        >
          <div className="flex items-center min-w-0">
            {logoBase64 ? (
              <img
                src={logoBase64}
                alt={agencyName ?? "GasAgency"}
                className="w-7 h-7 object-contain flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Flame className="w-4 h-4 text-white" />
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <span className="ml-2.5 text-[14px] font-semibold text-zinc-900 tracking-tight truncate">
                {agencyName ?? "GasAgency"}
              </span>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              type="button"
              className="md:hidden p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ padding: collapsed && !mobileOpen ? "12px 6px" : "12px 8px" }}>
          {sections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (!collapsed || mobileOpen) && (
                <p className="nav-section-label px-2">
                  {t.has(`nav.${getTranslationKey(section.label)}`)
                    ? t(`nav.${getTranslationKey(section.label)}`)
                    : section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== base && pathname.startsWith(item.href));
                const translatedLabel = t.has(`nav.${getTranslationKey(item.label)}`)
                  ? t(`nav.${getTranslationKey(item.label)}`)
                  : item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (mobileOpen && onCloseMobile) onCloseMobile();
                    }}
                    title={collapsed && !mobileOpen ? translatedLabel : undefined}
                    className={cn(
                      "nav-item",
                      isActive && "active",
                      collapsed && !mobileOpen && "justify-center px-0"
                    )}
                    style={{ height: 32 }}
                  >
                    <span className="nav-icon flex-shrink-0">{item.icon}</span>
                    {(!collapsed || mobileOpen) && <span className="truncate">{translatedLabel}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div
          className="flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-sidebar-border)", padding: collapsed && !mobileOpen ? "8px 6px" : "8px" }}
        >
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-md mb-1" style={{ background: "var(--color-sidebar-hover)" }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-zinc-900 truncate leading-none mb-0.5">{userName}</p>
                <p className="text-[11px] leading-none truncate font-medium text-blue-600 mt-0.5" title={customRoleName || undefined}>
                  {customRoleName || (t.has(`roles.${role}`) ? t(`roles.${role}`) : (ROLE_LABELS[role] || role))}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            className={cn("hidden md:flex nav-item w-full", collapsed && "justify-center px-0")}
            style={{ height: 30 }}
            title={collapsed ? t("nav.collapse") : undefined}
          >
            {collapsed
              ? <PanelLeft className="w-4 h-4 flex-shrink-0" />
              : <><PanelLeftClose className="w-4 h-4 flex-shrink-0 nav-icon" /><span className="text-[12px]">{t("nav.collapse")}</span></>
            }
          </button>
        </div>
      </aside>
    </>
  );
}
