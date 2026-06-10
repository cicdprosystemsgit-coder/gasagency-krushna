"use client";

import { useState, useTransition } from "react";
import { prisma } from "@/lib/prisma";
import { MessageSquarePlus, CheckCircle2, Clock, AlertCircle, XCircle, Filter } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Complaint = {
  id: string; category: string; description: string; status: string;
  createdAt: string; resolvedAt: string | null;
  customer: { name: string; phone: string; customerCode: string | null };
  resolvedBy: { name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  OPEN:        { label: "Open",        bg: "#FEE2E2", color: "#B91C1C", icon: <AlertCircle className="w-3 h-3" /> },
  IN_PROGRESS: { label: "In Progress", bg: "#FEF9C3", color: "#854D0E", icon: <Clock className="w-3 h-3" /> },
  RESOLVED:    { label: "Resolved",    bg: "#DCFCE7", color: "#15803D", icon: <CheckCircle2 className="w-3 h-3" /> },
  CLOSED:      { label: "Closed",      bg: "#F4F4F5", color: "#52525B", icon: <XCircle className="w-3 h-3" /> },
};

async function updateStatus(id: string, status: string, resolvedById?: string) {
  const response = await fetch("/api/complaints/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, resolvedById }),
  });
  return response.json();
}

type Props = { complaints: Complaint[]; role: string; userId: string };

export function ComplaintsClient({ complaints: initial, role, userId }: Props) {
  const [complaints, setComplaints] = useState<Complaint[]>(initial);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = filterStatus === "ALL" ? complaints : complaints.filter((c) => c.status === filterStatus);

  const counts = {
    ALL: complaints.length,
    OPEN: complaints.filter((c) => c.status === "OPEN").length,
    IN_PROGRESS: complaints.filter((c) => c.status === "IN_PROGRESS").length,
    RESOLVED: complaints.filter((c) => c.status === "RESOLVED").length,
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    startTransition(async () => {
      await updateStatus(id, newStatus, newStatus === "RESOLVED" ? userId : undefined);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: newStatus, resolvedAt: newStatus === "RESOLVED" ? new Date().toISOString() : c.resolvedAt }
            : c
        )
      );
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Customer Complaints</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Track and resolve customer issues</p>
        </div>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: "#71717A" }}>
          <AlertCircle className="w-4 h-4" style={{ color: "#DC2626" }} />
          {counts.OPEN} open
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => {
          const cfg = s === "ALL" ? null : STATUS_CONFIG[s];
          const count = s === "ALL" ? counts.ALL : counts[s as keyof typeof counts] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: filterStatus === s ? (cfg?.bg ?? "#18181B") : "#F4F4F5",
                color: filterStatus === s ? (cfg?.color ?? "#FFFFFF") : "#71717A",
                border: `1px solid ${filterStatus === s ? (cfg?.color ?? "#18181B") + "40" : "#E4E4E7"}`,
              }}
            >
              {cfg?.icon} {s === "ALL" ? "All" : cfg?.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>Raised</th>
              <th>Resolved By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                <MessageSquarePlus className="w-6 h-6 mx-auto mb-2 text-zinc-200" />
                No complaints in this category
              </td></tr>
            ) : filtered.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.OPEN;
              return (
                <tr key={c.id}>
                  <td>
                    <div>
                      <p className="font-medium text-[13px]">{c.customer.name}</p>
                      <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{c.customer.phone}</p>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{c.category.replace(/_/g, " ")}</span>
                  </td>
                  <td>
                    <p className="text-[12px] max-w-[200px] truncate" title={c.description} style={{ color: "#52525B" }}>{c.description}</p>
                  </td>
                  <td>
                    <span className="badge flex items-center gap-1 w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td className="text-[12px] muted">{formatDate(new Date(c.createdAt))}</td>
                  <td className="text-[12px] muted">{c.resolvedBy?.name ?? "—"}</td>
                  <td>
                    {c.status !== "CLOSED" && c.status !== "RESOLVED" && (
                      <div className="flex items-center gap-1">
                        {c.status === "OPEN" && (
                          <button
                            onClick={() => handleStatusChange(c.id, "IN_PROGRESS")}
                            disabled={isPending}
                            className="text-[11px] px-2 py-1 rounded font-medium hover:bg-yellow-50 transition-colors"
                            style={{ color: "#D97706", border: "1px solid #FDE68A" }}
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(c.id, "RESOLVED")}
                          disabled={isPending}
                          className="text-[11px] px-2 py-1 rounded font-medium hover:bg-green-50 transition-colors"
                          style={{ color: "#16A34A", border: "1px solid #86EFAC" }}
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleStatusChange(c.id, "CLOSED")}
                          disabled={isPending}
                          className="text-[11px] px-2 py-1 rounded font-medium hover:bg-zinc-100 transition-colors"
                          style={{ color: "#71717A", border: "1px solid #E4E4E7" }}
                        >
                          Close
                        </button>
                      </div>
                    )}
                    {(c.status === "RESOLVED" || c.status === "CLOSED") && (
                      <span className="text-[11px]" style={{ color: "#A1A1AA" }}>
                        {c.resolvedAt ? formatDate(new Date(c.resolvedAt)) : "—"}
                      </span>
                    )}
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
