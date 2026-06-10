import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Platform configuration</p>
      </div>
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 32, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Settings coming soon.</p>
      </div>
    </div>
  );
}
