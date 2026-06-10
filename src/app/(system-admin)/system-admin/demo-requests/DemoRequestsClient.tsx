"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  PhoneCall, Mail, Search, CheckCircle2, XCircle,
  Clock, CalendarCheck, Trophy, StickyNote, X,
} from "lucide-react";
import { updateDemoStatus, addDemoNote } from "@/app/actions/demo";

export interface DemoRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

/* ── Status config ──────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  NEW:       { label: "New",       bg: "#EFF6FF", color: "#2563EB", icon: <Clock    style={{ width: 11, height: 11 }} /> },
  CONTACTED: { label: "Contacted", bg: "#FFFBEB", color: "#B45309", icon: <PhoneCall style={{ width: 11, height: 11 }} /> },
  SCHEDULED: { label: "Scheduled", bg: "#F5F3FF", color: "#7C3AED", icon: <CalendarCheck style={{ width: 11, height: 11 }} /> },
  RESOLVED:  { label: "Resolved",  bg: "#F0FDF4", color: "#15803D", icon: <Trophy   style={{ width: 11, height: 11 }} /> },
  CANCELLED: { label: "Cancelled", bg: "#FEF2F2", color: "#DC2626", icon: <XCircle  style={{ width: 11, height: 11 }} /> },
};

const TABS = [
  { key: "ALL",       label: "All" },
  { key: "NEW",       label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "RESOLVED",  label: "Resolved" },
  { key: "CANCELLED", label: "Cancelled" },
];

/* ── Next-action buttons per status ────────────────────────── */
/* Always-visible 4 action buttons — active one is filled, others are outline */
const ALL_ACTIONS = [
  { label: "Contacted", status: "CONTACTED", activeColor: "#B45309", activeBg: "#F59E0B", border: "#FDE68A" },
  { label: "Scheduled", status: "SCHEDULED", activeColor: "#7C3AED", activeBg: "#8B5CF6", border: "#DDD6FE" },
  { label: "Resolved",  status: "RESOLVED",  activeColor: "#15803D", activeBg: "#16A34A", border: "#BBF7D0" },
  { label: "Cancelled", status: "CANCELLED", activeColor: "#DC2626", activeBg: "#EF4444", border: "#FECACA" },
] as const;

/* ── Note modal — rendered via portal to avoid invalid tbody>div nesting ── */
function NoteModal({ request, onClose }: { request: DemoRequest; onClose: () => void }) {
  const [note, setNote] = useState(request.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await addDemoNote(request.id, note);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    });
  }

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: "24px 28px", width: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Notes — {request.name}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{request.phone} · {request.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add internal notes about this demo request..."
          style={{
            width: "100%", height: 120, padding: "10px 12px", borderRadius: 8,
            border: "1px solid #E2E8F0", fontSize: 13, color: "#0F172A",
            resize: "none", fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500,
            border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={save} disabled={pending} style={{
            padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: saved ? "#16A34A" : "#6366F1", color: "#fff",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            opacity: pending ? 0.7 : 1,
          }}>
            {saved
              ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Saved!</>
              : pending ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Row ────────────────────────────────────────────────────── */
function DemoRow({
  req,
  onStatusChange,
}: {
  req: DemoRequest;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.NEW;
  const date = new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  function handleAction(next: string) {
    startTransition(async () => {
      await updateDemoStatus(req.id, next as never);
      onStatusChange(req.id, next);
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #F8FAFC", opacity: pending ? 0.6 : 1, transition: "opacity 0.15s" }}>
      {/* Portal mounts to document.body — no DOM nesting issue inside <tr> */}
      {noteOpen && <NoteModal request={req} onClose={() => setNoteOpen(false)} />}

      {/* Name */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#EFF6FF",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#2563EB", flexShrink: 0,
          }}>
            {req.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.3 }}>{req.name}</p>
            {req.notes && (
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 1, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {req.notes}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Phone */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <a href={`tel:${req.phone}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#334155", textDecoration: "none",
          padding: "4px 8px", borderRadius: 6, background: "#F8FAFC",
          border: "1px solid #E2E8F0",
        }}>
          <PhoneCall style={{ width: 12, height: 12, color: "#64748B" }} />
          {req.phone}
        </a>
      </td>

      {/* Email */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <a href={`mailto:${req.email}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "#334155", textDecoration: "none",
        }}>
          <Mail style={{ width: 12, height: 12, color: "#94A3B8" }} />
          {req.email}
        </a>
      </td>

      {/* Status badge */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
          background: cfg.bg, color: cfg.color,
          padding: "4px 10px", borderRadius: 999,
        }}>
          {cfg.icon} {cfg.label}
        </span>
      </td>

      {/* Date */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle", color: "#94A3B8", fontSize: 12 }}>
        {date}
      </td>

      {/* Actions — always show all 4 buttons */}
      <td style={{ padding: "10px 16px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
          {ALL_ACTIONS.map((a) => {
            const isActive = req.status === a.status;
            return (
              <button
                key={a.status}
                onClick={() => !isActive && handleAction(a.status)}
                disabled={pending || isActive}
                title={isActive ? `Current: ${a.label}` : `Mark as ${a.label}`}
                style={{
                  fontSize: 11, fontWeight: 700,
                  padding: "5px 10px", borderRadius: 6,
                  whiteSpace: "nowrap",
                  transition: "all 0.12s",
                  cursor: isActive ? "default" : pending ? "not-allowed" : "pointer",
                  // Active = solid filled; inactive = soft outline
                  background: isActive ? a.activeBg : "#F8FAFC",
                  color: isActive ? "#fff" : a.activeColor,
                  border: `1.5px solid ${isActive ? a.activeBg : a.border}`,
                  boxShadow: isActive ? `0 1px 4px ${a.activeBg}55` : "none",
                  opacity: pending && !isActive ? 0.5 : 1,
                }}
              >
                {isActive ? `✓ ${a.label}` : a.label}
              </button>
            );
          })}

          {/* Note button */}
          <button
            onClick={() => setNoteOpen(true)}
            title="Add / view note"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: req.notes ? "#FFFBEB" : "#F8FAFC",
              border: `1.5px solid ${req.notes ? "#FDE68A" : "#E2E8F0"}`,
              color: req.notes ? "#B45309" : "#94A3B8",
              cursor: "pointer",
            }}
          >
            <StickyNote style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main client component ──────────────────────────────────── */
export function DemoRequestsClient({ initialRequests }: { initialRequests: DemoRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");

  function handleStatusChange(id: string, status: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  }

  const filtered = requests.filter((r) => {
    const matchTab = activeTab === "ALL" || r.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = t.key === "ALL"
      ? requests.length
      : requests.filter((r) => r.status === t.key).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        borderBottom: "1px solid #E2E8F0", marginBottom: 20,
        overflowX: "auto",
      }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          const cfg = STATUS_CFG[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 14px", fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? (cfg?.color ?? "#0F172A") : "#64748B",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: active ? `2px solid ${cfg?.color ?? "#0F172A"}` : "2px solid transparent",
                whiteSpace: "nowrap", transition: "all 0.12s",
              }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 999,
                  background: active ? (cfg?.bg ?? "#F1F5F9") : "#F1F5F9",
                  color: active ? (cfg?.color ?? "#475569") : "#64748B",
                }}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          );
        })}

        {/* Search */}
        <div style={{ marginLeft: "auto", position: "relative", paddingBottom: 8 }}>
          <Search style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-70%)",
            width: 13, height: 13, color: "#94A3B8",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            style={{
              paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              borderRadius: 7, border: "1px solid #E2E8F0", fontSize: 12,
              color: "#334155", outline: "none", background: "#F8FAFC", width: 220,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden",
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <PhoneCall style={{ width: 18, height: 18, color: "#94A3B8" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>No requests found</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
              {search ? "Try a different search term." : "No demo requests in this category yet."}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                {["Name / Notes", "Mobile", "Email", "Status", "Requested", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "9px 16px", textAlign: "left",
                    fontSize: 11, fontWeight: 600, color: "#94A3B8",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <DemoRow key={r.id} req={r} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 12, textAlign: "right" }}>
        Showing {filtered.length} of {requests.length} total requests
      </p>
    </div>
  );
}
