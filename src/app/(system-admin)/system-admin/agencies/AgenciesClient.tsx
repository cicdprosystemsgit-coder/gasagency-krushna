"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Circle, ChevronDown } from "lucide-react";
import { updateAgencyStatus } from "@/app/actions/system-admin";

interface Agency {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  oilCompany: string | null;
  plan: string;
  status: string;
  userCount: number;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#15803D", label: "Active" },
  INACTIVE:  { bg: "#F4F4F5", color: "#52525B", label: "Inactive" },
  SUSPENDED: { bg: "#FEE2E2", color: "#DC2626", label: "Suspended" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function AgenciesClient({ initialAgencies }: { initialAgencies: Agency[] }) {
  const [agencies, setAgencies] = useState(initialAgencies);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = agencies.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || a.status === filter;
    return matchSearch && matchFilter;
  });

  function handleStatusChange(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    startTransition(async () => {
      const result = await updateAgencyStatus(id, status);
      if (result.success) {
        setAgencies((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      }
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#94A3B8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agencies..."
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              fontSize: 13, border: "1px solid #E2E8F0", borderRadius: 8,
              background: "#fff", outline: "none", color: "#0F172A",
            }}
          />
        </div>
        {(["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: filter === s ? "#6366F1" : "#fff",
              color: filter === s ? "#fff" : "#64748B",
              border: filter === s ? "1px solid #6366F1" : "1px solid #E2E8F0",
            }}
          >
            {s === "ALL" ? "All" : STATUS_STYLE[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              {["Agency", "Owner", "Location", "Oil Company", "Plan", "Users", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
                {search ? `No agencies matching "${search}"` : "No agencies yet."}
              </td></tr>
            ) : filtered.map((a) => {
              const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.INACTIVE;
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6366F1", flexShrink: 0 }}>
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>{a.name}</p>
                        <p style={{ fontSize: 11, color: "#94A3B8" }}>{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#475569" }}>{a.ownerName}</td>
                  <td style={{ padding: "10px 16px", color: "#64748B", fontSize: 12 }}>{a.city}, {a.state}</td>
                  <td style={{ padding: "10px 16px", color: "#64748B" }}>{a.oilCompany ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", background: "#EEF2FF", padding: "2px 8px", borderRadius: 999 }}>
                      {a.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#64748B", fontWeight: 600 }}>{a.userCount}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
                        value={a.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(a.id, e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED")}
                        style={{
                          fontSize: 11, fontWeight: 500,
                          background: s.bg, color: s.color,
                          border: "none", borderRadius: 999,
                          padding: "3px 8px", paddingRight: 22, cursor: "pointer",
                          appearance: "none", outline: "none",
                        }}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                      <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, color: s.color, pointerEvents: "none" }} />
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>{formatDate(a.createdAt)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <Link
                      href={`/system-admin/agencies/${a.id}`}
                      style={{ fontSize: 12, fontWeight: 500, color: "#6366F1", textDecoration: "none" }}
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
