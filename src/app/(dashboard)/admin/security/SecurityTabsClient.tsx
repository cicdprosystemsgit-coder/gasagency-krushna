"use client";

import { useState } from "react";
import { TwoFASetupClient } from "./TwoFASetupClient";
import { RolePermissionsClient } from "./RolePermissionsClient";
import { ShieldCheck, UserCheck } from "lucide-react";

export function SecurityTabsClient() {
  const [activeTab, setActiveTab] = useState<"2fa" | "rbac">("2fa");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-zinc-200/60 rounded-lg max-w-sm">
        <button
          onClick={() => setActiveTab("2fa")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-[13px] font-semibold rounded-md transition-all outline-none ${
            activeTab === "2fa"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 cursor-pointer"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Two-Factor Auth
        </button>
        <button
          onClick={() => setActiveTab("rbac")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-[13px] font-semibold rounded-md transition-all outline-none ${
            activeTab === "rbac"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 cursor-pointer"
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          Role Permissions
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "2fa" ? <TwoFASetupClient /> : <RolePermissionsClient />}
      </div>
    </div>
  );
}
