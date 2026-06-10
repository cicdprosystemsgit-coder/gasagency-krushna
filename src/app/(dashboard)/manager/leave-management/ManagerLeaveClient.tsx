"use client";

import { useState } from "react";
import { EmployeeLeaveClient, type LeaveRecord as EmpLeaveRecord } from "@/app/(dashboard)/staff/leave-management/EmployeeLeaveClient";
import { LeaveAdminClient, type LeaveRecord as AdminLeaveRecord, type EmployeeEntry } from "@/app/(dashboard)/admin/leave-management/LeaveAdminClient";
import { CalendarDays, Users } from "lucide-react";

interface ManagerLeaveClientProps {
  myLeaves: EmpLeaveRecord[];
  teamLeaves: AdminLeaveRecord[];
  employees: EmployeeEntry[];
  managerName: string;
  pendingTeam: number;
}

export function ManagerLeaveClient({
  myLeaves,
  teamLeaves,
  employees,
  managerName,
  pendingTeam,
}: ManagerLeaveClientProps) {
  const [activeTab, setActiveTab] = useState<"mine" | "team">("mine");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "mine", label: "My Leave Requests", badge: 0, icon: <CalendarDays className="w-3.5 h-3.5" /> },
          { key: "team", label: "Team Leave Management", badge: pendingTeam, icon: <Users className="w-3.5 h-3.5" /> },
        ].map(({ key, label, badge, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={activeTab === key
              ? { background: "#fff", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "none", cursor: "pointer" }
              : { background: "transparent", color: "#71717A", border: "none", cursor: "pointer" }}>
            {icon}
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "mine" && (
        <EmployeeLeaveClient
          initialLeaves={myLeaves}
          employeeName={managerName}
        />
      )}

      {activeTab === "team" && (
        <LeaveAdminClient
          initialLeaves={teamLeaves}
          employees={employees}
          role="MANAGER"
        />
      )}
    </div>
  );
}
