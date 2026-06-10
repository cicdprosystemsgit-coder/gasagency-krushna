import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Building2, Users, Activity, TrendingUp, Plus, ChevronRight,
  Circle, PhoneCall, Mail, Clock, CheckCircle2, XCircle,
} from "lucide-react";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#15803D", label: "Active" },
  INACTIVE:  { bg: "#F4F4F5", color: "#52525B", label: "Inactive" },
  SUSPENDED: { bg: "#FEE2E2", color: "#DC2626", label: "Suspended" },
};

const DEMO_STATUS: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  NEW:       { bg: "#EFF6FF", color: "#2563EB", label: "New", icon: <Clock style={{ width: 10, height: 10 }} /> },
  CONTACTED: { bg: "#F0FDF4", color: "#16A34A", label: "Contacted", icon: <CheckCircle2 style={{ width: 10, height: 10 }} /> },
  CLOSED:    { bg: "#F4F4F5", color: "#71717A", label: "Closed", icon: <XCircle style={{ width: 10, height: 10 }} /> },
};

export default async function SystemAdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const [totalAgencies, activeAgencies, suspendedAgencies, totalUsers, recentAgencies, demoRequests] =
    await Promise.all([
      prisma.agency.count(),
      prisma.agency.count({ where: { status: "ACTIVE" } }),
      prisma.agency.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { role: { not: "SYSTEM_ADMIN" } } }),
      prisma.agency.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { users: true } } },
      }),
      prisma.demoRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const newDemoCount = demoRequests.filter((d) => d.status === "NEW").length;

  const stats = [
    { label: "Total Agencies", value: totalAgencies, sub: "Onboarded", color: "#6366F1", icon: Building2 },
    { label: "Active",         value: activeAgencies, sub: "Running agencies", color: "#16A34A", icon: Activity },
    { label: "Total Users",    value: totalUsers, sub: "Across all agencies", color: "#2563EB", icon: Users },
    { label: "Suspended",      value: suspendedAgencies, sub: "Needs attention", color: suspendedAgencies > 0 ? "#DC2626" : "#A1A1AA", icon: TrendingUp },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>Platform Overview</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{formatDate(new Date())} — {session.name}</p>
        </div>
        <Link
          href="/system-admin/agencies/new"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#6366F1", color: "#fff", textDecoration: "none",
            boxShadow: "0 1px 2px rgba(99,102,241,0.3)",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Onboard Agency
        </Link>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 10, padding: "16px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
              <Icon style={{ width: 14, height: 14, color: color }} />
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Demo Requests */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Demo Requests</p>
            {newDemoCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#2563EB", padding: "2px 8px", borderRadius: 999 }}>
                {newDemoCount} new
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>Agency owners who booked a demo from the landing page</p>
        </div>

        {demoRequests.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <PhoneCall style={{ width: 18, height: 18, color: "#2563EB" }} />
            </div>
            <p style={{ fontSize: 13, color: "#94A3B8" }}>No demo requests yet.</p>
            <p style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>Agency owners who fill the landing page form will appear here.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                {["Name", "Mobile", "Email", "Status", "Requested On"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoRequests.map((d) => {
                const ds = DEMO_STATUS[d.status] ?? DEMO_STATUS.NEW;
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                    {/* Name */}
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#2563EB", flexShrink: 0 }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: "#0F172A" }}>{d.name}</span>
                      </div>
                    </td>
                    {/* Mobile */}
                    <td style={{ padding: "10px 16px" }}>
                      <a href={`tel:${d.phone}`} style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569", textDecoration: "none" }}>
                        <PhoneCall style={{ width: 12, height: 12, color: "#94A3B8" }} />
                        {d.phone}
                      </a>
                    </td>
                    {/* Email */}
                    <td style={{ padding: "10px 16px" }}>
                      <a href={`mailto:${d.email}`} style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569", textDecoration: "none" }}>
                        <Mail style={{ width: 12, height: 12, color: "#94A3B8" }} />
                        {d.email}
                      </a>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color, padding: "3px 8px", borderRadius: 999 }}>
                        {ds.icon}
                        {ds.label}
                      </span>
                    </td>
                    {/* Date */}
                    <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>
                      {formatDate(d.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent agencies table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Agencies</p>
          <Link href="/system-admin/agencies" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#6366F1", textDecoration: "none" }}>
            View all <ChevronRight style={{ width: 13, height: 13 }} />
          </Link>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              {["Agency", "Owner", "Oil Co.", "Plan", "Users", "Joined", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentAgencies.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
                No agencies onboarded yet. <Link href="/system-admin/agencies/new" style={{ color: "#6366F1" }}>Add first agency →</Link>
              </td></tr>
            ) : recentAgencies.map((a) => {
              const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.INACTIVE;
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6366F1", flexShrink: 0 }}>
                        {a.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#475569" }}>{a.ownerName}</td>
                  <td style={{ padding: "10px 16px", color: "#475569" }}>{a.oilCompany ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", background: "#EEF2FF", padding: "2px 8px", borderRadius: 999 }}>
                      {a.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#475569" }}>{a._count.users}</td>
                  <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>{formatDate(a.createdAt)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 999 }}>
                      <Circle style={{ width: 5, height: 5, fill: s.color, stroke: "none" }} />
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Link href={`/system-admin/agencies/${a.id}`} style={{ fontSize: 12, fontWeight: 500, color: "#6366F1", textDecoration: "none" }}>
                      Manage →
                    </Link>
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
