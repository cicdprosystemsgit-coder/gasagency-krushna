"use client";

import { useState, useTransition } from "react";
import { Plus, ToggleLeft, ToggleRight, Check, LayoutGrid } from "lucide-react";
import { addAgencyUser, toggleAgencyUser, updateAgencyFeatures } from "@/app/actions/system-admin";
import { ALL_FEATURES, FEATURE_CATEGORIES } from "@/lib/features";

interface AgencyUser {
  id: string; name: string; email: string;
  phone: string | null; role: string;
  isActive: boolean; createdAt: string;
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:         { bg: "#DBEAFE", color: "#1D4ED8" },
  MANAGER:       { bg: "#D1FAE5", color: "#065F46" },
  GODOWN_KEEPER: { bg: "#EDE9FE", color: "#5B21B6" },
  STAFF:         { bg: "#FEF3C7", color: "#92400E" },
  DELIVERY_BOY:  { bg: "#FEE2E2", color: "#991B1B" },
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  Operations:   { bg: "#EFF6FF", border: "#BFDBFE", accent: "#2563EB" },
  Accounts:     { bg: "#F0FDF4", border: "#BBF7D0", accent: "#16A34A" },
  Finance:      { bg: "#FFFBEB", border: "#FDE68A", accent: "#D97706" },
  People:       { bg: "#FDF4FF", border: "#E9D5FF", accent: "#9333EA" },
  Intelligence: { bg: "#FFF1F2", border: "#FECDD3", accent: "#E11D48" },
  Enterprise:   { bg: "#F1F5F9", border: "#CBD5E1", accent: "#475569" },
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", fontSize: 13,
  border: "1px solid #CBD5E1", borderRadius: 7, outline: "none",
  color: "#0F172A", background: "#fff", boxSizing: "border-box",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function AgencyDetailClient({
  agencyId,
  initialUsers,
  initialEnabledFeatures,
}: {
  agencyId: string;
  initialUsers: AgencyUser[];
  initialEnabledFeatures: string[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "STAFF", password: "" });

  // Feature management state
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    () => new Set(initialEnabledFeatures)
  );
  const [featSaved, setFeatSaved] = useState(false);
  const [featPending, startFeatTransition] = useTransition();

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function toggleFeature(key: string) {
    setFeatSaved(false);
    setEnabledFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleCategory(category: string) {
    setFeatSaved(false);
    const catKeys = ALL_FEATURES.filter((f) => f.category === category).map((f) => f.key);
    const allOn = catKeys.every((k) => enabledFeatures.has(k));
    setEnabledFeatures((prev) => {
      const next = new Set(prev);
      catKeys.forEach((k) => { if (allOn) next.delete(k); else next.add(k); });
      return next;
    });
  }

  function handleSaveFeatures() {
    startFeatTransition(async () => {
      await updateAgencyFeatures(agencyId, Array.from(enabledFeatures));
      setFeatSaved(true);
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())    { setError("Name required"); return; }
    if (!form.email.trim())   { setError("Email required"); return; }
    if (!form.password || form.password.length < 6) { setError("Password min. 6 chars"); return; }
    setError("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await addAgencyUser(agencyId, fd);
      if (result.error) { setError(result.error); return; }
      setUsers((prev) => [...prev, {
        id: crypto.randomUUID(), name: form.name, email: form.email,
        phone: form.phone || null, role: form.role, isActive: true,
        createdAt: new Date().toISOString(),
      }]);
      setForm({ name: "", email: "", phone: "", role: "STAFF", password: "" });
      setShowForm(false);
    });
  }

  function handleToggle(userId: string, current: boolean) {
    startTransition(async () => {
      await toggleAgencyUser(userId, !current, agencyId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !current } : u));
    });
  }

  return (
    <>
      {/* ── Users Table ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Users ({users.length})</p>
          <button
            onClick={() => { setShowForm(!showForm); setError(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: "#6366F1", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Add User
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} style={{ padding: "16px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {error && (
              <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 6, marginBottom: 12, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Name *</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Role *</label>
                <select value={form.role} onChange={(e) => set("role", e.target.value)} style={inputStyle}>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="GODOWN_KEEPER">Godown Keeper</option>
                  <option value="STAFF">Staff</option>
                  <option value="DELIVERY_BOY">Delivery Boy</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#475569", marginBottom: 4 }}>Password *</label>
                <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 6 chars" style={inputStyle} />
              </div>
              <button type="submit" disabled={isPending} style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "#6366F1", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {isPending ? "…" : "Add"}
              </button>
            </div>
          </form>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              {["Name", "Email", "Phone", "Role", "Joined", "Status", "Active"].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "36px 0", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>No users yet</td></tr>
            ) : users.map((u) => {
              const r = ROLE_STYLE[u.role] ?? { bg: "#F1F5F9", color: "#475569" };
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {u.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500, color: "#0F172A" }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#64748B", fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>{u.phone ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: r.bg, color: r.color, padding: "2px 8px", borderRadius: 999 }}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#94A3B8", fontSize: 12 }}>{formatDate(u.createdAt)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: u.isActive ? "#DCFCE7" : "#F4F4F5", color: u.isActive ? "#15803D" : "#52525B", padding: "2px 8px", borderRadius: 999 }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <button onClick={() => handleToggle(u.id, u.isActive)} disabled={isPending} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      {u.isActive
                        ? <ToggleRight style={{ width: 20, height: 20, color: "#16A34A" }} />
                        : <ToggleLeft style={{ width: 20, height: 20, color: "#94A3B8" }} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Feature Access Panel ─────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LayoutGrid style={{ width: 15, height: 15, color: "#6366F1" }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Feature Access</p>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>
              {enabledFeatures.size === 0
                ? "All features enabled (default)"
                : `${enabledFeatures.size} of ${ALL_FEATURES.length} enabled`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setFeatSaved(false); setEnabledFeatures(new Set(ALL_FEATURES.map((f) => f.key))); }}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #6366F1", background: "#EEF2FF", color: "#6366F1", cursor: "pointer", fontWeight: 500 }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setFeatSaved(false); setEnabledFeatures(new Set()); }}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#64748B", cursor: "pointer", fontWeight: 500 }}
            >
              None
            </button>
            <button
              onClick={handleSaveFeatures}
              disabled={featPending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, padding: "6px 14px", borderRadius: 7, fontWeight: 600,
                background: featSaved ? "#DCFCE7" : featPending ? "#A5B4FC" : "#6366F1",
                color: featSaved ? "#15803D" : "#fff",
                border: featSaved ? "1px solid #BBF7D0" : "none",
                cursor: featPending ? "not-allowed" : "pointer",
              }}
            >
              {featSaved ? <><Check style={{ width: 12, height: 12 }} /> Saved</> : featPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {FEATURE_CATEGORIES.map((category) => {
            const catFeatures = ALL_FEATURES.filter((f) => f.category === category);
            const enabledCount = catFeatures.filter((f) => enabledFeatures.has(f.key)).length;
            const allOn = enabledCount === catFeatures.length;
            const c = CATEGORY_COLORS[category];

            return (
              <div key={category} style={{ border: `1px solid ${c.border}`, borderRadius: 8, overflow: "hidden" }}>
                {/* Category header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: c.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.accent }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.accent }}>{category}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{enabledCount}/{catFeatures.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 999, cursor: "pointer", fontWeight: 500,
                      border: `1px solid ${c.accent}`, background: allOn ? c.accent : "transparent",
                      color: allOn ? "#fff" : c.accent,
                    }}
                  >
                    {allOn ? "Deselect all" : "Select all"}
                  </button>
                </div>

                {/* Feature items */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {catFeatures.map((feat, idx) => {
                    const on = enabledFeatures.has(feat.key);
                    const cols = catFeatures.length;
                    return (
                      <label
                        key={feat.key}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px",
                          cursor: "pointer", background: on ? "#FAFBFF" : "#fff",
                          borderTop: "1px solid #F1F5F9",
                          borderRight: (idx % 3 < 2 && idx < cols - 1) ? "1px solid #F1F5F9" : "none",
                        }}
                      >
                        <div style={{
                          marginTop: 1, width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: `2px solid ${on ? c.accent : "#CBD5E1"}`,
                          background: on ? c.accent : "#fff",
                        }}>
                          {on && <Check style={{ width: 9, height: 9, color: "#fff" }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 1 }}>{feat.label}</p>
                          <p style={{ fontSize: 10, color: "#94A3B8", lineHeight: 1.4 }}>{feat.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleFeature(feat.key)}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
