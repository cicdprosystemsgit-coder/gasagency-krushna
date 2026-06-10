import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  SYSTEM_ADMIN:  { bg: "#EDE9FE", color: "#5B21B6" },
  ADMIN:         { bg: "#DBEAFE", color: "#1D4ED8" },
  MANAGER:       { bg: "#D1FAE5", color: "#065F46" },
  GODOWN_KEEPER: { bg: "#FEF3C7", color: "#92400E" },
  STAFF:         { bg: "#F4F4F5", color: "#52525B" },
  DELIVERY_BOY:  { bg: "#FEE2E2", color: "#991B1B" },
};

export default async function AllUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    where: { role: { not: "SYSTEM_ADMIN" } },
    include: { agency: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>All Users</h1>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{users.length} users across all agencies</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              {["Name", "Email", "Role", "Agency", "Joined", "Status"].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const r = ROLE_STYLE[u.role] ?? { bg: "#F4F4F5", color: "#52525B" };
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6366F1", flexShrink: 0 }}>
                        {u.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500, color: "#0F172A" }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#64748B", fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: r.bg, color: r.color, padding: "2px 8px", borderRadius: 999 }}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#64748B" }}>{u.agency?.name ?? "—"}</td>
                  <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>{formatDate(u.createdAt)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: u.isActive ? "#DCFCE7" : "#F4F4F5", color: u.isActive ? "#15803D" : "#52525B", padding: "2px 8px", borderRadius: 999 }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
