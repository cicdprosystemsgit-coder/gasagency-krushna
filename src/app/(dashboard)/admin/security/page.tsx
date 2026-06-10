import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SecurityTabsClient } from "./SecurityTabsClient";
import { Shield } from "lucide-react";

export default async function SecurityPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "SYSTEM_ADMIN"].includes(session.role)) redirect("/login");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
          <Shield className="w-5 h-5" style={{ color: "#2563EB" }} />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Security Settings</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Manage two-factor authentication and role permissions</p>
        </div>
      </div>
      <SecurityTabsClient />
    </div>
  );
}
