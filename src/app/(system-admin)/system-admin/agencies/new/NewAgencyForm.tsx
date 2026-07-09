"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAgency } from "@/app/actions/system-admin";
import { Building2, User, LayoutGrid, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { ALL_FEATURES, FEATURE_CATEGORIES } from "@/lib/features";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Chandigarh","Puducherry",
];

const OIL_COMPANIES = ["HP GAS", "INDANE", "BHARAT GAS", "Other"];
const PLANS = [
  { value: "basic",      label: "Basic",      desc: "Up to 5 users" },
  { value: "pro",        label: "Pro",        desc: "Up to 20 users" },
  { value: "enterprise", label: "Enterprise", desc: "Unlimited users" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", fontSize: 13,
  border: "1px solid #CBD5E1", borderRadius: 7, outline: "none",
  color: "#0F172A", background: "#fff", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 5,
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  Operations:    { bg: "#EFF6FF", border: "#BFDBFE", accent: "#2563EB" },
  Accounts:      { bg: "#F0FDF4", border: "#BBF7D0", accent: "#16A34A" },
  Finance:       { bg: "#FFFBEB", border: "#FDE68A", accent: "#D97706" },
  People:        { bg: "#FDF4FF", border: "#E9D5FF", accent: "#9333EA" },
  Intelligence:  { bg: "#FFF1F2", border: "#FECDD3", accent: "#E11D48" },
  Enterprise:    { bg: "#F1F5F9", border: "#CBD5E1", accent: "#475569" },
};

export function NewAgencyForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [agencyForm, setAgencyForm] = useState({
    name: "", ownerName: "", email: "", phone: "",
    address: "", city: "", state: "Maharashtra",
    gstin: "", distributorCode: "", oilCompany: "HP GAS",
    licenseNo: "", plan: "basic", notes: "",
    slug: "",
  });

  const [adminForm, setAdminForm] = useState({
    adminName: "", adminEmail: "", adminPhone: "", adminPassword: "",
  });

  // All features selected by default
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    () => new Set(ALL_FEATURES.map((f) => f.key))
  );

  function setA(k: string, v: string) { setAgencyForm((p) => ({ ...p, [k]: v })); }
  function setU(k: string, v: string) { setAdminForm((p) => ({ ...p, [k]: v })); }

  function toggleFeature(key: string) {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleCategory(category: string) {
    const catKeys = ALL_FEATURES.filter((f) => f.category === category).map((f) => f.key);
    const allOn = catKeys.every((k) => selectedFeatures.has(k));
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      catKeys.forEach((k) => { if (allOn) next.delete(k); else next.add(k); });
      return next;
    });
  }

  function validateStep1() {
    if (!agencyForm.name.trim())      { setError("Agency name is required"); return false; }
    if (!agencyForm.slug.trim())      { setError("Subdomain slug is required"); return false; }
    if (!/^[a-z0-9-]+$/.test(agencyForm.slug)) { setError("Subdomain slug can only contain lowercase letters, numbers, and hyphens"); return false; }
    if (!agencyForm.ownerName.trim()) { setError("Owner name is required"); return false; }
    if (!agencyForm.email.trim())     { setError("Agency email is required"); return false; }
    if (!/\S+@\S+\.\S+/.test(agencyForm.email)) { setError("Invalid email address"); return false; }
    if (!agencyForm.phone.trim() || !/^\d{10}$/.test(agencyForm.phone)) { setError("Phone must be 10 digits"); return false; }
    if (!agencyForm.address.trim())   { setError("Address is required"); return false; }
    if (!agencyForm.city.trim())      { setError("City is required"); return false; }
    setError(""); return true;
  }

  function validateStep2() {
    if (!adminForm.adminName.trim())  { setError("Admin name is required"); return false; }
    if (!adminForm.adminEmail.trim()) { setError("Admin email is required"); return false; }
    if (!/\S+@\S+\.\S+/.test(adminForm.adminEmail)) { setError("Invalid admin email"); return false; }
    if (!adminForm.adminPassword || adminForm.adminPassword.length < 6) {
      setError("Password must be at least 6 characters"); return false;
    }
    setError(""); return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    Object.entries({ ...agencyForm, ...adminForm }).forEach(([k, v]) => fd.append(k, v));
    // Append selected features as JSON
    fd.append("enabledFeatures", JSON.stringify(Array.from(selectedFeatures)));

    startTransition(async () => {
      const result = await createAgency(fd);
      if (result.error) { setError(result.error); return; }
      router.push(`/system-admin/agencies/${result.agencyId}`);
    });
  }

  const STEPS = [
    { n: 1, icon: Building2, label: "Agency Details",  sub: "Name, address, oil company" },
    { n: 2, icon: User,       label: "Admin Account",   sub: "Login credentials" },
    { n: 3, icon: LayoutGrid, label: "Feature Access",  sub: "Select enabled modules" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>
      {/* Steps sidebar */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Steps</p>
        {STEPS.map(({ n, icon: Icon, label, sub }) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: n < 3 ? "1px solid #F1F5F9" : "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: step === n ? "#6366F1" : step > n ? "#DCFCE7" : "#F1F5F9",
              color: step === n ? "#fff" : step > n ? "#15803D" : "#94A3B8",
            }}>
              {step > n ? <Check style={{ width: 14, height: 14 }} /> : <Icon style={{ width: 14, height: 14 }} />}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: step === n ? 600 : 500, color: step === n ? "#0F172A" : "#64748B" }}>{label}</p>
              <p style={{ fontSize: 11, color: "#94A3B8" }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form panel */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {error && (
          <div style={{ fontSize: 13, padding: "10px 14px", borderRadius: 7, marginBottom: 20, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Agency Information ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 20 }}>Agency Information</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Agency Name *</label>
                <input value={agencyForm.name} onChange={(e) => setA("name", e.target.value)} placeholder="e.g. Sharma Gas Agency" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subdomain / Tenant Slug *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    value={agencyForm.slug}
                    onChange={(e) => setA("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g. sharma"
                    style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
                  />
                  <span style={{
                    padding: "8px 12px", fontSize: 13, color: "#64748B",
                    background: "#F1F5F9", border: "1px solid #CBD5E1",
                    borderLeft: "none", borderTopRightRadius: 7, borderBottomRightRadius: 7,
                    userSelect: "none",
                  }}>
                    .localhost:3000
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Owner Name *</label>
                <input value={agencyForm.ownerName} onChange={(e) => setA("ownerName", e.target.value)} placeholder="e.g. Ramesh Sharma" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Agency Email *</label>
                <input type="email" value={agencyForm.email} onChange={(e) => setA("email", e.target.value)} placeholder="agency@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone * (10 digits)</label>
                <input type="tel" value={agencyForm.phone} onChange={(e) => setA("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full Address *</label>
              <input value={agencyForm.address} onChange={(e) => setA("address", e.target.value)} placeholder="Shop No., Street, Area" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={agencyForm.city} onChange={(e) => setA("city", e.target.value)} placeholder="e.g. Pune" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State *</label>
                <select value={agencyForm.state} onChange={(e) => setA("state", e.target.value)} style={inputStyle}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Oil Company</label>
                <select value={agencyForm.oilCompany} onChange={(e) => setA("oilCompany", e.target.value)} style={inputStyle}>
                  {OIL_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Distributor Code</label>
                <input value={agencyForm.distributorCode} onChange={(e) => setA("distributorCode", e.target.value)} placeholder="DIST-001" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License No.</label>
                <input value={agencyForm.licenseNo} onChange={(e) => setA("licenseNo", e.target.value)} placeholder="LIC-XXXX" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>GSTIN</label>
                <input value={agencyForm.gstin} onChange={(e) => setA("gstin", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" style={inputStyle} maxLength={15} />
              </div>
              <div>
                <label style={labelStyle}>Plan</label>
                <select value={agencyForm.plan} onChange={(e) => setA("plan", e.target.value)} style={inputStyle}>
                  {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea value={agencyForm.notes} onChange={(e) => setA("notes", e.target.value)} placeholder="Any internal notes..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { if (validateStep1()) setStep(2); }} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#6366F1", color: "#fff", border: "none", cursor: "pointer",
              }}>
                Next: Admin Account <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Admin Account ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Admin Account</h2>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              This person will log in as the <strong>ADMIN</strong> for <strong>{agencyForm.name}</strong>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input value={adminForm.adminName} onChange={(e) => setU("adminName", e.target.value)} placeholder="Ramesh Kumar" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" value={adminForm.adminEmail} onChange={(e) => setU("adminEmail", e.target.value)} placeholder="admin@sharma-gas.com" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Phone (optional)</label>
                <input type="tel" value={adminForm.adminPhone} onChange={(e) => setU("adminPhone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password * (min. 6 chars)</label>
                <input type="password" value={adminForm.adminPassword} onChange={(e) => setU("adminPassword", e.target.value)} placeholder="Set a secure password" style={inputStyle} />
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 10 }}>Summary</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Agency", agencyForm.name],
                  ["Owner", agencyForm.ownerName],
                  ["Oil Company", agencyForm.oilCompany || "—"],
                  ["Plan", agencyForm.plan.toUpperCase()],
                  ["City", `${agencyForm.city}, ${agencyForm.state}`],
                  ["GSTIN", agencyForm.gstin || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 11, color: "#94A3B8" }}>{k}</p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => { setStep(1); setError(""); }} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: "#F1F5F9", color: "#475569", border: "none", cursor: "pointer",
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Back
              </button>
              <button onClick={() => { if (validateStep2()) setStep(3); }} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#6366F1", color: "#fff", border: "none", cursor: "pointer",
              }}>
                Next: Feature Access <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Feature Selection ────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Feature Access</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setSelectedFeatures(new Set(ALL_FEATURES.map((f) => f.key)))} style={{
                  fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #6366F1",
                  background: "#EEF2FF", color: "#6366F1", cursor: "pointer", fontWeight: 500,
                }}>
                  Select All
                </button>
                <button type="button" onClick={() => setSelectedFeatures(new Set())} style={{
                  fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #CBD5E1",
                  background: "#F8FAFC", color: "#64748B", cursor: "pointer", fontWeight: 500,
                }}>
                  Clear All
                </button>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Choose which modules <strong>{agencyForm.name}</strong> admin can access.{" "}
              <span style={{ fontWeight: 500, color: selectedFeatures.size === ALL_FEATURES.length ? "#16A34A" : "#6366F1" }}>
                {selectedFeatures.size} of {ALL_FEATURES.length} features selected.
              </span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {FEATURE_CATEGORIES.map((category) => {
                const catFeatures = ALL_FEATURES.filter((f) => f.category === category);
                const enabledCount = catFeatures.filter((f) => selectedFeatures.has(f.key)).length;
                const allOn = enabledCount === catFeatures.length;
                const c = CATEGORY_COLORS[category];

                return (
                  <div key={category} style={{ border: `1px solid ${c.border}`, borderRadius: 8, overflow: "hidden" }}>
                    {/* Category header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: c.bg }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.accent }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.accent }}>{category}</span>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{enabledCount}/{catFeatures.length}</span>
                      </div>
                      <button type="button" onClick={() => toggleCategory(category)} style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 500,
                        border: `1px solid ${c.accent}`, background: allOn ? c.accent : "transparent",
                        color: allOn ? "#fff" : c.accent,
                      }}>
                        {allOn ? "Deselect all" : "Select all"}
                      </button>
                    </div>

                    {/* Feature items */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {catFeatures.map((feat, idx) => {
                        const on = selectedFeatures.has(feat.key);
                        return (
                          <label key={feat.key} style={{
                            display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
                            cursor: "pointer", background: on ? "#FAFBFF" : "#fff",
                            borderTop: "1px solid #F1F5F9",
                            borderRight: idx % 2 === 0 ? "1px solid #F1F5F9" : "none",
                          }}>
                            <div style={{
                              marginTop: 2, width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: `2px solid ${on ? c.accent : "#CBD5E1"}`,
                              background: on ? c.accent : "#fff",
                            }}>
                              {on && <Check style={{ width: 10, height: 10, color: "#fff" }} />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>{feat.label}</p>
                              <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>{feat.description}</p>
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

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => { setStep(2); setError(""); }} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: "#F1F5F9", color: "#475569", border: "none", cursor: "pointer",
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Back
              </button>
              <button type="submit" disabled={isPending} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isPending ? "#A5B4FC" : "#6366F1", color: "#fff",
                border: "none", cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Creating…" : `Create Agency (${selectedFeatures.size} features)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
