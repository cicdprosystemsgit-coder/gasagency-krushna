"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  ShieldAlert, Save, RefreshCw, Check, AlertCircle, Trash2, Eye,
  Search, CheckCircle2, Filter, Lock,
  Boxes, Warehouse, Truck, Users, Receipt, ShoppingCart, CreditCard,
  ShieldCheck, FileText, Wallet, BarChart3, CalendarDays, BookOpen,
  TrendingUp, FileDown, FolderOpen, MessageSquarePlus, Building2,
  KeyRound, Car, PieChart, Clock, LayoutDashboard, X, Sparkles
} from "lucide-react";
import { getRolePermissions, savePermissionsBatch } from "@/app/actions/rbac";
import { deleteCustomRole } from "@/app/actions/staff";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";

export type ModuleCategory =
  | "Operations"
  | "Accounts"
  | "Finance"
  | "People"
  | "Intelligence"
  | "Enterprise";

export interface ResourceItem {
  key: string;
  label: string;
  category: ModuleCategory;
  description: string;
  icon: any;
}

const ROLES: { key: string; label: string; baseRole?: string }[] = [
  { key: "MANAGER", label: "Manager" },
  { key: "STAFF", label: "Office Staff" },
  { key: "GODOWN_KEEPER", label: "Godown Keeper" },
  { key: "CASHIER", label: "Cashier" },
  { key: "DELIVERY_BOY", label: "Delivery Boy" },
];

export const RESOURCES: ResourceItem[] = [
  // Operations
  { key: "stock", label: "Daily Stock Register & Tally", category: "Operations", description: "Daily cylinder opening, arrivals, vehicle dispatches & closing tallies", icon: BookOpen },
  { key: "inventory", label: "Office Cylinder Stock", category: "Operations", description: "Direct office cylinder counts and physical floor inventory logs", icon: Boxes },
  { key: "godown", label: "Godown & Yard Management", category: "Operations", description: "Godown tanker/truck arrival, bulk receipt and empty cylinder movements", icon: Warehouse },
  { key: "deliveryRequests", label: "Vehicle Loading Requests", category: "Operations", description: "Delivery boy cylinder requests, godown acceptance & vehicle loading", icon: Truck },
  { key: "vehicles", label: "Delivery Fleet Management", category: "Operations", description: "Internal trucks, three-wheelers, odometer & fuel tracking records", icon: Car },
  { key: "deliveries", label: "Cylinder Delivery Records", category: "Operations", description: "Daily customer delivery execution, SV/TV dispatches & cylinder handovers", icon: Truck },
  { key: "deliveryPlan", label: "Delivery Route Planning", category: "Operations", description: "Route assignments, trip planning and delivery schedules", icon: Truck },

  // Accounts & Sales
  { key: "customers", label: "Customer Account Profiles", category: "Accounts", description: "Customer master records, addresses, connection numbers & KYC", icon: Users },
  { key: "transactions", label: "Office Cash Transactions", category: "Accounts", description: "Over-the-counter payments, customer receipts and office cash book", icon: Receipt },
  { key: "commercialSales", label: "Commercial Sales & Invoicing", category: "Accounts", description: "19kg commercial cylinder sales, hotel/bulk customer orders & invoices", icon: ShoppingCart },
  { key: "creditLedger", label: "Customer Credit Ledger", category: "Accounts", description: "Customer credit balances, payment collection schedules and dues", icon: CreditCard },
  { key: "regulators", label: "Regulator Inventory & Ledger", category: "Accounts", description: "DPR regulator security deposits, replacements and returns", icon: ShieldCheck },
  { key: "gstInvoices", label: "GST Tax Invoices & B2B Billing", category: "Accounts", description: "B2B and B2C GST compliant invoices, HSN summaries and PDF printing", icon: FileText },
  { key: "products", label: "Product & Pricing Catalog", category: "Accounts", description: "Cylinder variants, retail pricing, deposits and product definitions", icon: Boxes },

  // Finance & Banking
  { key: "accounts", label: "Finance & Bank Accounts", category: "Finance", description: "Agency bank accounts, personal ledgers, fund transfers & tax summary", icon: LayoutDashboard },
  { key: "salaries", label: "Employee Salary & Drawings", category: "Finance", description: "Monthly payroll profiles, salary slips, advances and partner drawings", icon: Wallet },
  { key: "expenses", label: "Expenses & Vehicle Fuel Costs", category: "Finance", description: "Office petty cash, vehicle maintenance, fuel bills and operational expenses", icon: BarChart3 },
  { key: "companyPayments", label: "Oil Company Payments", category: "Finance", description: "Indane/Bharat/HPCL purchase payments, bank drafts and company ledgers", icon: Building2 },
  { key: "assets", label: "Agency Assets Management", category: "Finance", description: "Physical machinery, furniture, computers and asset depreciation", icon: PieChart },
  { key: "dailyClosings", label: "EOD Summary Cash Closings", category: "Finance", description: "End-of-day cash reconciliation, cashier handovers and closing balances", icon: BookOpen },

  // People & Workforce
  { key: "staff", label: "Staff KYC & Logins", category: "People", description: "Staff accounts, passwords, Aadhaar/PAN documents and role assignments", icon: Users },
  { key: "attendance", label: "Staff Attendance & GPS Map", category: "People", description: "Daily selfie punch-in, geo-fenced coordinates and live tracking map", icon: Clock },
  { key: "leaves", label: "Leave Approval Workflow", category: "People", description: "Staff leave applications, vacation approvals and attendance adjustments", icon: CalendarDays },
  { key: "approvals", label: "Daily Summary & Request Approvals", category: "People", description: "Managerial and administrative approvals for daily sheets and requests", icon: BookOpen },

  // Intelligence & Reports
  { key: "analytics", label: "Analytics & Intelligence Reports", category: "Intelligence", description: "Executive KPI reports, sales trends, delivery heatmaps & leak audits", icon: TrendingUp },
  { key: "export", label: "Data & Reports Export", category: "Intelligence", description: "Exporting transactions, customer ledgers and tax data to Excel/CSV", icon: FileDown },
  { key: "paymentReceipts", label: "Payment Receipt PDFs", category: "Intelligence", description: "Thermal receipt printer outputs, customer receipts and billing PDFs", icon: Receipt },
  { key: "documents", label: "KYC & Document Vault", category: "Intelligence", description: "Archived customer and staff KYC proof documents and ID scans", icon: FolderOpen },
  { key: "complaints", label: "Customer Complaint Logs", category: "Intelligence", description: "Leakage emergencies, delivery complaints and resolution ticketing", icon: MessageSquarePlus },

  // Enterprise & Security
  { key: "branches", label: "Multi-Branch Support", category: "Enterprise", description: "Branch switches, multi-location godown tracking and agency partitions", icon: Building2 },
  { key: "apiKeys", label: "External Developer API Gateway", category: "Enterprise", description: "API keys, webhook configurations and third-party ERP integrations", icon: KeyRound },
  { key: "security", label: "2FA & Security Audits", category: "Enterprise", description: "Two-factor authentication, login session audit logs and access alerts", icon: ShieldCheck },
];

const CATEGORIES: { key: "ALL" | ModuleCategory; label: string }[] = [
  { key: "ALL", label: "All Modules" },
  { key: "Operations", label: "Operations & Stock" },
  { key: "Accounts", label: "Accounts & Sales" },
  { key: "Finance", label: "Finance & Banking" },
  { key: "People", label: "People & HR" },
  { key: "Intelligence", label: "Intelligence & Reports" },
  { key: "Enterprise", label: "Enterprise & Security" },
];

const ACTIONS = [
  { key: "read", label: "Read / View", desc: "View records, search and open details" },
  { key: "create", label: "Create / Add", desc: "Submit new entries and transactions" },
  { key: "update", label: "Edit / Update", desc: "Modify existing records and approvals" },
  { key: "delete", label: "Delete", desc: "Remove or cancel records" },
];

const DEFAULT_PERMISSIONS_STATIC: Record<string, Record<string, string[]>> = {
  MANAGER: {
    stock: ["create", "read", "update"],
    inventory: ["create", "read", "update"],
    godown: ["create", "read", "update"],
    deliveryRequests: ["create", "read", "update"],
    vehicles: ["create", "read", "update"],
    deliveries: ["create", "read", "update"],
    deliveryPlan: ["create", "read", "update"],
    customers: ["create", "read", "update"],
    transactions: ["create", "read", "update"],
    commercialSales: ["create", "read", "update"],
    creditLedger: ["create", "read", "update"],
    regulators: ["create", "read", "update"],
    gstInvoices: ["create", "read", "update"],
    products: ["read"],
    accounts: ["read"],
    salaries: ["read"],
    expenses: ["create", "read"],
    companyPayments: ["create", "read", "update"],
    assets: ["create", "read", "update"],
    dailyClosings: ["create", "read", "update"],
    staff: ["read"],
    attendance: ["create", "read", "update"],
    leaves: ["create", "read", "update"],
    approvals: ["create", "read", "update"],
    analytics: ["read"],
    export: ["read"],
    paymentReceipts: ["create", "read"],
    documents: ["create", "read"],
    complaints: ["create", "read", "update"],
    branches: ["read"],
  },
  GODOWN_KEEPER: {
    godown: ["create", "read", "update"],
    stock: ["create", "read", "update"],
    deliveryRequests: ["create", "read", "update"],
    vehicles: ["create", "read", "update"],
    deliveries: ["create", "read", "update"],
    inventory: ["read", "update"],
    deliveryPlan: ["read"],
    approvals: ["read", "update"],
    leaves: ["create", "read"],
    attendance: ["create", "read"],
    expenses: ["create", "read"],
    salaries: ["read"],
  },
  CASHIER: {
    customers: ["create", "read", "update"],
    transactions: ["create", "read"],
    commercialSales: ["create", "read"],
    creditLedger: ["create", "read"],
    regulators: ["create", "read"],
    gstInvoices: ["create", "read"],
    inventory: ["read"],
    stock: ["read"],
    dailyClosings: ["create", "read"],
    expenses: ["create", "read"],
    salaries: ["read"],
    paymentReceipts: ["create", "read"],
    attendance: ["create", "read"],
    leaves: ["create", "read"],
  },
  STAFF: {
    customers: ["create", "read", "update"],
    transactions: ["create", "read"],
    commercialSales: ["create", "read"],
    creditLedger: ["create", "read"],
    regulators: ["create", "read"],
    gstInvoices: ["create", "read"],
    inventory: ["read"],
    stock: ["create", "read", "update"],
    attendance: ["create", "read"],
    leaves: ["create", "read"],
    salaries: ["read"],
    paymentReceipts: ["create", "read"],
  },
  DELIVERY_BOY: {
    deliveries: ["read", "update"],
    deliveryRequests: ["create", "read"],
    deliveryPlan: ["read"],
    attendance: ["create", "read"],
    leaves: ["create", "read"],
    salaries: ["read"],
  },
};

export function RolePermissionsClient() {
  const confirm = useConfirm();
  const [allRoles, setAllRoles] = useState<{ key: string; label: string; baseRole?: string }[]>(ROLES);
  const [activeRole, setActiveRole] = useState<string>("MANAGER");
  const [dbOverrides, setDbOverrides] = useState<any[]>([]);
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | ModuleCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);

  // Preview Mode State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Initialize and load overrides
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setIsLoading(true);
    const result = await getRolePermissions();
    if ("error" in result) {
      setMessage({ type: "error", text: result.error || "Failed to load permissions" });
      setIsLoading(false);
      return;
    }

    const overrides = result.overrides || [];
    setDbOverrides(overrides);

    const customRoles = result.customRoles || [];
    const mappedCustom = customRoles.map((cr: any) => ({
      key: cr.id,
      label: cr.name,
      baseRole: cr.baseRole,
    }));
    const updatedRoles = [...ROLES, ...mappedCustom];
    setAllRoles(updatedRoles);

    // Build the grid state: Role -> Resource -> Action -> boolean
    const initialMatrix: any = {};

    updatedRoles.forEach((r) => {
      initialMatrix[r.key] = {};
      RESOURCES.forEach((res) => {
        initialMatrix[r.key][res.key] = {};
        ACTIONS.forEach((act) => {
          // Check database override first
          const dbOverride = overrides.find(
            (o) => o.role === r.key && o.resource === res.key && o.action === act.key
          );

          if (dbOverride !== undefined) {
            initialMatrix[r.key][res.key][act.key] = dbOverride.isAllowed;
          } else {
            // Fall back to static defaults based on baseRole
            const baseTemplate = r.baseRole || r.key;
            const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
            const allowedActions = defaults[res.key] || [];
            initialMatrix[r.key][res.key][act.key] = allowedActions.includes(act.key);
          }
        });
      });
    });

    setMatrixState(initialMatrix);
    setIsLoading(false);
  };

  const handleToggle = (role: string, resource: string, action: string) => {
    setMatrixState((prev) => {
      const current = prev[role]?.[resource]?.[action];
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [resource]: {
            ...prev[role]?.[resource],
            [action]: !current,
          },
        },
      };
    });
  };

  // Batch actions for current category or role
  const handleBatchCategory = (actionType: "GRANT_READ" | "GRANT_ALL" | "REVOKE_ALL" | "RESET_DEFAULTS") => {
    const activeRoleObj = allRoles.find((r) => r.key === activeRole);
    const baseTemplate = activeRoleObj?.baseRole || activeRole;
    const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};

    const targetResources = RESOURCES.filter(
      (r) => selectedCategory === "ALL" || r.category === selectedCategory
    );

    setMatrixState((prev) => {
      const updatedRoleMatrix = { ...(prev[activeRole] || {}) };

      targetResources.forEach((res) => {
        const row = { ...(updatedRoleMatrix[res.key] || {}) };

        ACTIONS.forEach((act) => {
          if (actionType === "GRANT_READ") {
            if (act.key === "read") row[act.key] = true;
          } else if (actionType === "GRANT_ALL") {
            row[act.key] = true;
          } else if (actionType === "REVOKE_ALL") {
            row[act.key] = false;
          } else if (actionType === "RESET_DEFAULTS") {
            const allowedInDefaults = defaults[res.key] || [];
            row[act.key] = allowedInDefaults.includes(act.key);
          }
        });

        updatedRoleMatrix[res.key] = row;
      });

      return {
        ...prev,
        [activeRole]: updatedRoleMatrix,
      };
    });
  };

  // Calculate customized overrides count
  const unsavedDiffsCount = useMemo(() => {
    let diffs = 0;
    allRoles.forEach((r) => {
      RESOURCES.forEach((res) => {
        ACTIONS.forEach((act) => {
          const val = matrixState[r.key]?.[res.key]?.[act.key];
          const baseTemplate = r.baseRole || r.key;
          const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
          const allowedActions = defaults[res.key] || [];
          const wasAllowedByDefault = allowedActions.includes(act.key);

          const existingOverride = dbOverrides.find(
            (o) => o.role === r.key && o.resource === res.key && o.action === act.key
          );

          if (existingOverride !== undefined) {
            if (val !== existingOverride.isAllowed) diffs++;
          } else {
            if (val !== wasAllowedByDefault) diffs++;
          }
        });
      });
    });
    return diffs;
  }, [allRoles, matrixState, dbOverrides]);

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const updates: { role: string; resource: string; action: string; isAllowed: boolean }[] = [];

      allRoles.forEach((r) => {
        RESOURCES.forEach((res) => {
          ACTIONS.forEach((act) => {
            const val = matrixState[r.key]?.[res.key]?.[act.key];
            const baseTemplate = r.baseRole || r.key;
            const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
            const allowedActions = defaults[res.key] || [];
            const wasAllowedByDefault = allowedActions.includes(act.key);

            const existingOverride = dbOverrides.find(
              (o) => o.role === r.key && o.resource === res.key && o.action === act.key
            );

            if (val !== wasAllowedByDefault || existingOverride !== undefined) {
              updates.push({
                role: r.key,
                resource: res.key,
                action: act.key,
                isAllowed: val ?? false,
              });
            }
          });
        });
      });

      if (updates.length === 0) {
        setMessage({ type: "success", text: "No custom overrides to save (all match defaults)." });
        return;
      }

      const res = await savePermissionsBatch(updates);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: `Successfully saved ${updates.length} custom permission settings!` });
        loadPermissions();
      }
    });
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    const ok = await confirm({
      title: `Delete Custom Role "${roleName}"?`,
      message: `Are you sure you want to delete the custom role "${roleName}"? Users assigned to this role will revert to inheriting defaults from their base template role.`,
      confirmText: "Delete Role",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    setIsLoading(true);
    const res = await deleteCustomRole(roleId);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
      setIsLoading(false);
    } else {
      setMessage({ type: "success", text: `Successfully deleted custom role "${roleName}"!` });
      if (activeRole === roleId) {
        setActiveRole("MANAGER");
      }
      loadPermissions();
    }
  };

  // Filtered resources for the active view
  const filteredResources = useMemo(() => {
    const activeRoleObj = allRoles.find((r) => r.key === activeRole);
    const baseTemplate = activeRoleObj?.baseRole || activeRole;
    const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};

    return RESOURCES.filter((res) => {
      // Category match
      if (selectedCategory !== "ALL" && res.category !== selectedCategory) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = res.label.toLowerCase().includes(q) || res.key.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      // Custom override filter
      if (filterCustomOnly) {
        const hasCustomAction = ACTIONS.some((act) => {
          const isChecked = matrixState[activeRole]?.[res.key]?.[act.key] || false;
          const allowedActions = defaults[res.key] || [];
          const wasAllowedByDefault = allowedActions.includes(act.key);
          return isChecked !== wasAllowedByDefault;
        });
        if (!hasCustomAction) return false;
      }

      return true;
    });
  }, [selectedCategory, searchQuery, filterCustomOnly, activeRole, allRoles, matrixState]);

  // Telemetry for active role
  const activeRoleStats = useMemo(() => {
    let readableCount = 0;
    let fullAccessCount = 0;
    let restrictedCount = 0;
    let totalCustomizedCount = 0;

    const activeRoleObj = allRoles.find((r) => r.key === activeRole);
    const baseTemplate = activeRoleObj?.baseRole || activeRole;
    const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};

    RESOURCES.forEach((res) => {
      const readGranted = matrixState[activeRole]?.[res.key]?.["read"] || false;
      const createGranted = matrixState[activeRole]?.[res.key]?.["create"] || false;
      const updateGranted = matrixState[activeRole]?.[res.key]?.["update"] || false;
      const deleteGranted = matrixState[activeRole]?.[res.key]?.["delete"] || false;

      if (readGranted && createGranted && updateGranted && deleteGranted) {
        fullAccessCount++;
      } else if (readGranted) {
        readableCount++;
      } else {
        restrictedCount++;
      }

      const hasCustom = ACTIONS.some((act) => {
        const isChecked = matrixState[activeRole]?.[res.key]?.[act.key] || false;
        const allowedActions = defaults[res.key] || [];
        return isChecked !== allowedActions.includes(act.key);
      });
      if (hasCustom) totalCustomizedCount++;
    });

    return {
      readableCount,
      fullAccessCount,
      restrictedCount,
      totalCustomizedCount,
      totalModules: RESOURCES.length,
    };
  }, [activeRole, matrixState, allRoles]);

  const activeRoleObj = allRoles.find((r) => r.key === activeRole);

  if (isLoading) {
    return (
      <div className="card p-12 text-center text-sm text-zinc-500 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="font-semibold text-zinc-800">Loading Access Management Matrix...</p>
        <p className="text-xs text-zinc-400 mt-1">Retrieving agency roles, permissions and override policies</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header & Telemetry Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              Enterprise RBAC & Security Gateway
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Role Access & Permission Management</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Fine-tune operational access for all system and custom staff roles. Toggle capabilities across all 31 system modules or inspect the live role preview.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition shadow-xs cursor-pointer backdrop-blur-sm"
              title="Preview exact sidebar experience and access summary for this role"
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              Role View Preview
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || unsavedDiffsCount === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                unsavedDiffsCount > 0
                  ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-300 animate-pulse"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes {unsavedDiffsCount > 0 ? `(${unsavedDiffsCount})` : ""}
            </button>
          </div>
        </div>

        {/* Telemetry Pills for Selected Role */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Configured For</span>
            <p className="text-base font-bold text-white mt-0.5 truncate">{activeRoleObj?.label}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold block">Full Access Modules</span>
            <p className="text-base font-bold text-emerald-300 mt-0.5">
              {activeRoleStats.fullAccessCount} <span className="text-xs text-slate-400">/ {activeRoleStats.totalModules}</span>
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-blue-400 uppercase font-semibold block">Read-Only / Partial</span>
            <p className="text-base font-bold text-blue-300 mt-0.5">{activeRoleStats.readableCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-amber-400 uppercase font-semibold block">Custom Overrides</span>
            <p className="text-base font-bold text-amber-300 mt-0.5">
              {activeRoleStats.totalCustomizedCount > 0 ? `${activeRoleStats.totalCustomizedCount} modules` : "Using Defaults"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Role Selector Tabs ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-3 mr-1">
            Target Role:
          </span>
          {allRoles.map((role) => {
            const isActive = activeRole === role.key;
            return (
              <div key={role.key} className="inline-flex items-center">
                <button
                  onClick={() => setActiveRole(role.key)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <span>{role.label}</span>
                  {role.baseRole && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${isActive ? "bg-blue-700 text-blue-100" : "bg-zinc-200 text-zinc-500"}`}>
                      Custom
                    </span>
                  )}
                </button>
                {role.baseRole && (
                  <button
                    onClick={() => handleDeleteRole(role.key, role.label)}
                    title={`Delete custom role "${role.label}"`}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action Toolbar: Categories, Search & Batch Actions ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  selectedCategory === cat.key
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterCustomOnly(!filterCustomOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                filterCustomOnly
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {filterCustomOnly ? "Showing Custom Only" : "Filter Custom Overrides"}
            </button>
          </div>
        </div>

        {/* Search & Quick Batch Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module name or description (e.g. stock, godown, invoices)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Batch Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
              Quick Set:
            </span>
            <button
              onClick={() => handleBatchCategory("GRANT_READ")}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              title="Grant Read permission for all filtered modules"
            >
              Grant View
            </button>
            <button
              onClick={() => handleBatchCategory("GRANT_ALL")}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              title="Grant Full Access (Read, Create, Update, Delete) for all filtered modules"
            >
              Grant Full
            </button>
            <button
              onClick={() => handleBatchCategory("REVOKE_ALL")}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition cursor-pointer"
              title="Revoke all access for filtered modules"
            >
              Revoke All
            </button>
            <button
              onClick={() => handleBatchCategory("RESET_DEFAULTS")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Reset all modules in this view to role defaults"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Permissions Grid Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 px-4 w-1/3">System Module Resource</th>
                {ACTIONS.map((act) => (
                  <th key={act.key} className="py-3.5 px-3 text-center w-36">
                    <div>{act.label}</div>
                    <span className="text-[9px] font-normal text-zinc-400 normal-case hidden lg:block">
                      {act.desc}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Filter className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="font-semibold text-zinc-600">No modules match your current filter</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Try resetting the search or category filter</p>
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
                  const Icon = res.icon || Boxes;
                  const baseTemplate = activeRoleObj?.baseRole || activeRole;
                  const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
                  const allowedByDefault = defaults[res.key] || [];

                  const hasRowOverride = ACTIONS.some((act) => {
                    const isChecked = matrixState[activeRole]?.[res.key]?.[act.key] || false;
                    return isChecked !== allowedByDefault.includes(act.key);
                  });

                  return (
                    <tr
                      key={res.key}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        hasRowOverride ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* Module Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5 text-zinc-700">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{res.label}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                                {res.category}
                              </span>
                              {hasRowOverride && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  <Sparkles className="w-2.5 h-2.5" /> Customized
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xl">
                              {res.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 4 Action Switches */}
                      {ACTIONS.map((act) => {
                        const isChecked = matrixState[activeRole]?.[res.key]?.[act.key] || false;
                        const wasAllowedByDefault = allowedByDefault.includes(act.key);
                        const isActionCustomized = isChecked !== wasAllowedByDefault;

                        return (
                          <td key={act.key} className="py-3 px-3 text-center align-middle">
                            <label className="inline-flex flex-col items-center justify-center cursor-pointer select-none group">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => handleToggle(activeRole, res.key, act.key)}
                              />
                              <div
                                className={`w-10 h-5.5 rounded-full relative transition-all duration-200 flex items-center ${
                                  isChecked
                                    ? isActionCustomized
                                      ? "bg-amber-600 ring-2 ring-amber-300 ring-offset-1"
                                      : "bg-blue-600"
                                    : "bg-zinc-200"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white shadow-xs absolute transition-all duration-200 ${
                                    isChecked ? "left-5.5" : "left-0.75"
                                  }`}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-semibold mt-1 transition-colors ${
                                  isChecked
                                    ? isActionCustomized
                                      ? "text-amber-700"
                                      : "text-blue-600"
                                    : "text-zinc-400"
                                }`}
                              >
                                {isChecked ? (isActionCustomized ? "Allowed (Custom)" : "Allowed") : "Blocked"}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Default Role Permission</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-300" />
              <span>Agency Custom Override</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPermissions}
              disabled={isPending}
              className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload Policy
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || unsavedDiffsCount === 0}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                unsavedDiffsCount > 0
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save All Permissions ({unsavedDiffsCount} unsaved)
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Notification Alert ── */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── PREVIEW FEATURE MODAL ── */}
      {previewModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewModalOpen(false)}
          title={`Live Access Preview — ${activeRoleObj?.label}`}
        >
          <div className="space-y-6 text-sm max-h-[80vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-zinc-900 text-sm">
                  Staff Role Experience Simulator
                </h3>
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                This preview accurately mirrors what a user assigned to <strong>{activeRoleObj?.label}</strong> will see in their dashboard and navigation bar based on your active configuration.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Visible Modules</span>
                <p className="text-xl font-bold text-emerald-900 mt-0.5">
                  {activeRoleStats.fullAccessCount + activeRoleStats.readableCount}
                </p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-rose-700 uppercase">Restricted (Hidden)</span>
                <p className="text-xl font-bold text-rose-900 mt-0.5">
                  {activeRoleStats.restrictedCount}
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">Custom Overrides</span>
                <p className="text-xl font-bold text-amber-900 mt-0.5">
                  {activeRoleStats.totalCustomizedCount}
                </p>
              </div>
            </div>

            {/* Mock Sidebar View */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Simulated Sidebar Navigation
                </span>
                <span className="text-[11px] text-zinc-400">
                  Matches `RESOURCE_TO_NAV`
                </span>
              </div>

              <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-4">
                {/* Brand snippet */}
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                    GA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">GasAgency Portal</p>
                    <p className="text-[10px] text-zinc-400">Viewing as {activeRoleObj?.label}</p>
                  </div>
                </div>

                {/* Navigation items grouped by category */}
                <div className="space-y-3">
                  {CATEGORIES.filter((c) => c.key !== "ALL").map((cat) => {
                    const catKey = cat.key as ModuleCategory;
                    const catResources = RESOURCES.filter((r) => r.category === catKey);

                    // Find which ones have read permission
                    const allowedInCat = catResources.filter(
                      (r) => matrixState[activeRole]?.[r.key]?.["read"]
                    );

                    if (allowedInCat.length === 0) return null;

                    return (
                      <div key={cat.key} className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-2">
                          {cat.label}
                        </span>
                        <div className="space-y-0.5">
                          {allowedInCat.map((res) => {
                            const Icon = res.icon || Boxes;
                            const canCreate = matrixState[activeRole]?.[res.key]?.["create"];
                            const canUpdate = matrixState[activeRole]?.[res.key]?.["update"];
                            const canDelete = matrixState[activeRole]?.[res.key]?.["delete"];

                            return (
                              <div
                                key={res.key}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="font-medium text-zinc-200">{res.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {canCreate && (
                                    <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 font-mono">
                                      +New
                                    </span>
                                  )}
                                  {canUpdate && (
                                    <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                      Edit
                                    </span>
                                  )}
                                  {canDelete && (
                                    <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300 font-mono">
                                      Del
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Restricted modules summary */}
            {activeRoleStats.restrictedCount > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block mb-2">
                  Hidden / Restricted Modules ({activeRoleStats.restrictedCount})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RESOURCES.filter((r) => !matrixState[activeRole]?.[r.key]?.["read"]).map((r) => (
                    <span
                      key={r.key}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      <Lock className="w-3 h-3 text-rose-500" />
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-zinc-200">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
