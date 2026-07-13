"use client";

import { useState, useEffect, useTransition } from "react";
import { ShieldAlert, Save, RefreshCw, Check, AlertCircle, Trash2 } from "lucide-react";
import { getRolePermissions, savePermissionsBatch } from "@/app/actions/rbac";
import { deleteCustomRole } from "@/app/actions/staff";

type Role = "ADMIN" | "MANAGER" | "STAFF" | "GODOWN_KEEPER" | "CASHIER" | "DELIVERY_BOY" | "SYSTEM_ADMIN";

const ROLES: { key: string; label: string; baseRole?: string }[] = [
  { key: "MANAGER", label: "Manager" },
  { key: "STAFF", label: "Office Staff" },
  { key: "GODOWN_KEEPER", label: "Godown Keeper" },
  { key: "CASHIER", label: "Cashier" },
  { key: "DELIVERY_BOY", label: "Delivery Boy" },
];

const RESOURCES = [
  { key: "analytics", label: "Analytics & Intelligence Reports" },
  { key: "customers", label: "Customer Account Profiles" },
  { key: "products", label: "Product & Price Configuration" },
  { key: "inventory", label: "Office Cylinder Stock" },
  { key: "godown", label: "Godown Load/Unload Logs" },
  { key: "vehicles", label: "Delivery Fleet Management" },
  { key: "deliveries", label: "Cylinder Delivery Records" },
  { key: "transactions", label: "Office Cash Transactions" },
  { key: "salaries", label: "Employee Salary Profiles" },
  { key: "expenses", label: "Expense & Budget Records" },
  { key: "leaves", label: "Leave Approval Workflow" },
  { key: "gstInvoices", label: "GST Tax Invoices" },
  { key: "dailyClosings", label: "EOD Summary Closings" },
  { key: "branches", label: "Multi-Branch Support" },
  { key: "staff", label: "Staff KYC & Logins" },
  { key: "approvals", label: "Daily Summary Approvals" },
  { key: "paymentReceipts", label: "Payment Receipt PDFs" },
  { key: "documents", label: "KYC Document Uploads" },
  { key: "complaints", label: "Customer Complaint Logs" },
  { key: "apiKeys", label: "External Developer API Keys" },
  { key: "security", label: "2FA & Security Audits" },
];

const ACTIONS = [
  { key: "read", label: "Read" },
  { key: "create", label: "Create" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
];

// Replicate static default permissions for UI initialization
const DEFAULT_PERMISSIONS_STATIC: Record<string, Record<string, string[]>> = {
  MANAGER: {
    customers: ["create", "read", "update"],
    products: ["read"],
    inventory: ["create", "read", "update"],
    godown: ["create", "read", "update"],
    vehicles: ["create", "read", "update"],
    deliveries: ["create", "read", "update"],
    transactions: ["create", "read", "update"],
    salaries: ["read"],
    expenses: ["create", "read"],
    leaves: ["create", "read", "update"],
    gstInvoices: ["create", "read", "update"],
    dailyClosings: ["create", "read", "update"],
    branches: ["read"],
    staff: ["read"],
    approvals: ["create", "read", "update"],
    paymentReceipts: ["create", "read"],
    documents: ["create", "read"],
    complaints: ["create", "read", "update"],
    analytics: ["read"],
  },
  GODOWN_KEEPER: {
    inventory: ["read", "update"],
    godown: ["create", "read", "update"],
    leaves: ["create", "read"],
    salaries: ["read"],
  },
  CASHIER: {
    customers: ["create", "read", "update"],
    transactions: ["create", "read"],
    gstInvoices: ["create", "read"],
    inventory: ["read"],
    leaves: ["create", "read"],
    salaries: ["read"],
    paymentReceipts: ["create", "read"],
  },
  STAFF: {
    customers: ["create", "read", "update"],
    transactions: ["create", "read"],
    gstInvoices: ["create", "read"],
    inventory: ["read"],
    leaves: ["create", "read"],
    salaries: ["read"],
    paymentReceipts: ["create", "read"],
  },
  DELIVERY_BOY: {
    deliveries: ["read", "update"],
    leaves: ["create", "read"],
    salaries: ["read"],
  },
};

export function RolePermissionsClient() {
  const [allRoles, setAllRoles] = useState<{ key: string; label: string; baseRole?: string }[]>(ROLES);
  const [activeRole, setActiveRole] = useState<string>("MANAGER");
  const [dbOverrides, setDbOverrides] = useState<any[]>([]);
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      // Gather all updates
      const updates: { role: string; resource: string; action: string; isAllowed: boolean }[] = [];

      allRoles.forEach((r) => {
        RESOURCES.forEach((res) => {
          ACTIONS.forEach((act) => {
            const val = matrixState[r.key]?.[res.key]?.[act.key];
            
            // Check if this differs from default or exists as override
            const baseTemplate = r.baseRole || r.key;
            const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
            const allowedActions = defaults[res.key] || [];
            const wasAllowedByDefault = allowedActions.includes(act.key);
            
            const existingOverride = dbOverrides.find(
              (o) => o.role === r.key && o.resource === res.key && o.action === act.key
            );

            // Only update/upsert if it is customized (differs from default or we have an override)
            if (val !== wasAllowedByDefault || existingOverride !== undefined) {
              updates.push({
                role: r.key,
                resource: res.key,
                action: act.key,
                isAllowed: val,
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
        setMessage({ type: "success", text: `Successfully saved ${updates.length} custom permission overrides!` });
        loadPermissions(); // reload from DB
      }
    });
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the custom role "${roleName}"? Any users assigned to this role will revert to having no custom role and will inherit permissions from their base template role.`)) {
      return;
    }
    
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

  if (isLoading) {
    return (
      <div className="card p-8 text-center text-[13px] text-zinc-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
        Loading role matrix config...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="card p-4 flex gap-3 items-start bg-amber-50 border border-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-800 leading-relaxed">
          <p className="font-semibold">Enterprise Authorization overrides</p>
          <p className="mt-0.5">
            By default, roles inherit pre-configured access rights. Toggling actions below will save custom overrides in the database for your agency. System Admin bypasses all checks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-zinc-200 gap-y-1">
        {allRoles.map((role) => (
          <div key={role.key} className="flex items-center relative -mb-px">
            <button
              onClick={() => setActiveRole(role.key)}
              className={`px-4 py-2 text-[13px] font-semibold transition-colors border-b-2 outline-none ${
                activeRole === role.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {role.label}
            </button>
            {role.baseRole && (
              <button
                onClick={() => handleDeleteRole(role.key, role.label)}
                title={`Delete custom role "${role.label}"`}
                className="p-1 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 rounded-md transition-colors mr-2 my-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Permissions Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="w-1/2">Module Resource</th>
                {ACTIONS.map((act) => (
                  <th key={act.key} className="text-center">{act.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((res) => (
                <tr key={res.key} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                  <td className="font-medium text-zinc-700">{res.label}</td>
                  {ACTIONS.map((act) => {
                    const isChecked = matrixState[activeRole]?.[res.key]?.[act.key] || false;
                    
                    // Check if this is custom or default
                    const activeRoleObj = allRoles.find(r => r.key === activeRole);
                    const baseTemplate = activeRoleObj?.baseRole || activeRole;
                    const defaults = DEFAULT_PERMISSIONS_STATIC[baseTemplate] || {};
                    const allowedActions = defaults[res.key] || [];
                    const wasAllowedByDefault = allowedActions.includes(act.key);
                    const isCustomized = isChecked !== wasAllowedByDefault;

                    return (
                      <td key={act.key} className="text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isChecked}
                            onChange={() => handleToggle(activeRole, res.key, act.key)}
                          />
                          <div
                            className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${
                              isChecked ? "bg-blue-600" : "bg-zinc-200"
                            } ${isCustomized ? "ring-2 ring-indigo-300 ring-offset-1" : ""}`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all duration-200 ${
                                isChecked ? "left-4.75" : "left-0.75"
                              }`}
                            />
                          </div>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-zinc-50 border-t flex items-center justify-between">
          <div className="text-[11px] text-zinc-400">
            <span className="inline-block w-2.5 h-2.5 rounded bg-blue-600 ring-2 ring-indigo-300 mr-1.5" />
            Highlighted switch indicates a customized permission override.
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadPermissions}
              disabled={isPending}
              className="btn btn-secondary flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="btn btn-primary flex items-center gap-1.5"
            >
              {isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Overrides
            </button>
          </div>
        </div>
      </div>

      {/* Messaging alerts */}
      {message && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-[12px] animate-fade-in ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
