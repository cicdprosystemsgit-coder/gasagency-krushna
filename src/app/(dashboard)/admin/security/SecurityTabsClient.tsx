"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TwoFASetupClient } from "./TwoFASetupClient";
import { RolePermissionsClient } from "./RolePermissionsClient";
import { AdminSecurityRequestsTab } from "@/components/profile/AdminSecurityRequestsTab";
import { ShieldCheck, UserCheck, KeyRound } from "lucide-react";

export function SecurityTabsClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "rbac" || tabParam === "permissions" || tabParam === "access"
      ? "rbac"
      : tabParam === "requests"
      ? "requests"
      : "2fa";
  const [activeTab, setActiveTab] = useState<"2fa" | "rbac" | "requests">(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "rbac" || currentTab === "permissions" || currentTab === "access") {
      setActiveTab("rbac");
    } else if (currentTab === "requests") {
      setActiveTab("requests");
    } else if (currentTab === "2fa") {
      setActiveTab("2fa");
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-2xl max-w-xl shadow-2xs">
        <button
          onClick={() => setActiveTab("2fa")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === "2fa"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Two-Factor Auth
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === "requests"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-600" />
          Credential Requests
        </button>
        <button
          onClick={() => setActiveTab("rbac")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === "rbac"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          Access &amp; Roles
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "2fa" && <TwoFASetupClient />}
        {activeTab === "requests" && <AdminSecurityRequestsTab />}
        {activeTab === "rbac" && <RolePermissionsClient />}
      </div>
    </div>
  );
}
