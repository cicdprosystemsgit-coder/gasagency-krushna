"use client";

import { useState, useTransition } from "react";
import { raiseComplaintFromPortal } from "@/app/actions/customer-portal";
import { Package, CreditCard, MessageSquare, Receipt, Phone, MapPin, Building2, Plus, X, CheckCircle2 } from "lucide-react";

type PortalData = {
  customer: { name: string; phone: string; address: string | null; type: string; customerCode: string | null; agency: { name: string; phone: string; address: string; city: string } };
  deliveries: Array<{ date: string; product: string; qty: number; status: string }>;
  creditEntries: Array<{ date: string; type: string; amount: number; description: string | null }>;
  outstandingBalance: number;
  complaints: Array<{ id: string; category: string; status: string; description: string; createdAt: string; resolvedAt: string | null }>;
  receipts: Array<{ receiptNo: string; amount: number; paymentMode: string; date: string }>;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN:        { bg: "#FEE2E2", color: "#B91C1C" },
  IN_PROGRESS: { bg: "#FEF9C3", color: "#854D0E" },
  RESOLVED:    { bg: "#DCFCE7", color: "#15803D" },
  CLOSED:      { bg: "#F4F4F5", color: "#52525B" },
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCur(n: number) {
  return `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function CustomerPortalClient({ data, customerCode }: { data: PortalData; customerCode: string }) {
  const [tab, setTab] = useState<"deliveries" | "payments" | "complaints" | "receipts">("deliveries");
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ category: "DELIVERY_DELAY", description: "" });
  const [isPending, startTransition] = useTransition();
  const [complaintMsg, setComplaintMsg] = useState<string | null>(null);

  const handleRaiseComplaint = () => {
    startTransition(async () => {
      const result = await raiseComplaintFromPortal({ customerCode, ...complaintForm });
      if ("error" in result && result.error) { setComplaintMsg(result.error); }
      else { setComplaintMsg("✅ Complaint raised successfully! We will contact you shortly."); setShowComplaintForm(false); }
    });
  };

  const { customer } = data;

  return (
    <div className="min-h-screen" style={{ background: "#F4F4F5" }}>
      {/* Header */}
      <div style={{ background: "#18181B" }} className="px-4 pt-8 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">🔥</div>
            <span className="text-[13px] font-medium" style={{ color: "#A1A1AA" }}>{customer.agency.name}</span>
          </div>
          <h1 className="text-[22px] font-bold text-white mb-1">Welcome, {customer.name}</h1>
          <p className="text-[13px]" style={{ color: "#71717A" }}>Customer Code: <span className="font-mono font-bold text-zinc-300">{customer.customerCode}</span></p>
          <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: "#A1A1AA" }}>
            <Phone className="w-3 h-3" /> {customer.phone}
            {customer.address && <><span>·</span><MapPin className="w-3 h-3" /> {customer.address}</>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8">
        {/* Balance card */}
        <div className="rounded-xl p-5 mb-4 shadow-lg" style={{ background: data.outstandingBalance > 0 ? "#DC2626" : "#16A34A" }}>
          <p className="text-[12px] text-white/70 mb-1">Outstanding Balance</p>
          <p className="text-[28px] font-bold text-white">{fmtCur(data.outstandingBalance)}</p>
          <p className="text-[12px] text-white/60 mt-1">{data.outstandingBalance > 0 ? "Amount due to agency" : "No dues — account clear ✓"}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}>
          {([["deliveries", "📦 Deliveries"], ["payments", "💳 Credit"], ["complaints", "⚠️ Complaints"], ["receipts", "🧾 Receipts"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="flex-1 py-2 px-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap" style={{ background: tab === id ? "#18181B" : "transparent", color: tab === id ? "#FFFFFF" : "#71717A" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card overflow-hidden mb-6">
          {tab === "deliveries" && (
            <>
              <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Last {data.deliveries.length} Deliveries</p></div>
              {data.deliveries.length === 0 ? (
                <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No deliveries on record</div>
              ) : data.deliveries.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{d.product}</p>
                    <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{fmt(d.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold" style={{ color: "#18181B" }}>{d.qty} cyl</p>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#DCFCE7", color: "#15803D" }}>{d.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "payments" && (
            <>
              <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Credit Ledger</p></div>
              {data.creditEntries.length === 0 ? (
                <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No credit entries</div>
              ) : data.creditEntries.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{e.description || e.type}</p>
                    <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{fmt(e.date)}</p>
                  </div>
                  <p className="text-[14px] font-bold" style={{ color: e.type === "PAYMENT" ? "#16A34A" : "#DC2626" }}>
                    {e.type === "PAYMENT" ? "-" : "+"}{fmtCur(e.amount)}
                  </p>
                </div>
              ))}
            </>
          )}

          {tab === "complaints" && (
            <>
              <div className="card-section flex items-center justify-between">
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>My Complaints</p>
                <button onClick={() => setShowComplaintForm(!showComplaintForm)} className="btn btn-primary flex items-center gap-1 text-[12px] py-1.5">
                  <Plus className="w-3 h-3" /> Raise
                </button>
              </div>
              {showComplaintForm && (
                <div className="p-4" style={{ borderBottom: "1px solid #E4E4E7" }}>
                  <select className="input mb-3" value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}>
                    {["DELIVERY_DELAY", "WRONG_CYLINDER", "BILLING", "CYLINDER_DAMAGE", "OTHER"].map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                  <textarea className="input mb-3" rows={3} placeholder="Describe your issue in detail…" value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={handleRaiseComplaint} disabled={isPending} className="btn btn-primary text-[12px]">{isPending ? "Submitting…" : "Submit Complaint"}</button>
                    <button onClick={() => setShowComplaintForm(false)} className="btn btn-secondary text-[12px]">Cancel</button>
                  </div>
                </div>
              )}
              {complaintMsg && <div className="px-4 py-3 text-[13px]" style={{ color: "#15803D", background: "#F0FDF4" }}>{complaintMsg}</div>}
              {data.complaints.length === 0 && !showComplaintForm && (
                <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No complaints raised</div>
              )}
              {data.complaints.map((c) => {
                const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.OPEN;
                return (
                  <div key={c.id} className="px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-[13px] font-medium" style={{ color: "#18181B" }}>{c.category.replace(/_/g, " ")}</p>
                      <span className="badge" style={{ background: sc.bg, color: sc.color }}>{c.status}</span>
                    </div>
                    <p className="text-[12px] mb-1" style={{ color: "#52525B" }}>{c.description}</p>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{fmt(c.createdAt)}{c.resolvedAt ? ` · Resolved ${fmt(c.resolvedAt)}` : ""}</p>
                  </div>
                );
              })}
            </>
          )}

          {tab === "receipts" && (
            <>
              <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Payment Receipts</p></div>
              {data.receipts.length === 0 ? (
                <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No receipts on record</div>
              ) : data.receipts.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
                  <div>
                    <p className="text-[13px] font-medium font-mono" style={{ color: "#2563EB" }}>{r.receiptNo}</p>
                    <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{fmt(r.date)} · {r.paymentMode}</p>
                  </div>
                  <p className="text-[15px] font-bold" style={{ color: "#16A34A" }}>{fmtCur(r.amount)}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Agency contact */}
        <div className="card p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" style={{ color: "#A1A1AA" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{customer.agency.name}</p>
          </div>
          <p className="text-[12px] flex items-center gap-1.5 mb-1" style={{ color: "#52525B" }}><Phone className="w-3 h-3" /> {customer.agency.phone}</p>
          <p className="text-[12px] flex items-center gap-1.5" style={{ color: "#52525B" }}><MapPin className="w-3 h-3" /> {customer.agency.address}, {customer.agency.city}</p>
        </div>
      </div>
    </div>
  );
}
