"use client";

import { useState, useTransition } from "react";
import { assignPlan, startTrial } from "@/app/actions/subscription";
import { PLANS } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, TrendingUp, Users, DollarSign, Building2 } from "lucide-react";

type Stats = { totalAgencies: number; paidSubscriptions: number; onTrial: number; freePlan: number; mrr: number; arr: number; byPlan: Record<string, number> } | null;
type Agency = {
  id: string; name: string; ownerName: string; email: string; phone: string;
  subscriptionPlan: string; trialEndsAt: string | null; status: string;
  subscription: { plan: string; endDate: string; isActive: boolean; billingCycle: string; amount: number } | null;
};

type Props = { stats: Stats; subscriptions: unknown[]; agencies: Agency[] };

export function SubscriptionsDashboardClient({ stats, agencies: initial }: Props) {
  const [agencies, setAgencies] = useState<Agency[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleAssignPlan = (agencyId: string, plan: string, billingCycle: string) => {
    setActionId(agencyId);
    startTransition(async () => {
      const result = await assignPlan(agencyId, plan as "basic" | "professional" | "enterprise", billingCycle as "monthly" | "yearly");
      if ("error" in result && result.error) { setMsg(result.error); }
      else { setMsg(`Plan updated to ${plan} (${billingCycle})`); }
      setActionId(null);
    });
  };

  const handleStartTrial = (agencyId: string) => {
    setActionId(agencyId);
    startTransition(async () => {
      const result = await startTrial(agencyId);
      if ("error" in result && result.error) { setMsg(result.error); }
      else { setMsg("14-day Professional trial started"); }
      setActionId(null);
    });
  };

  const statusOf = (agency: Agency) => {
    const sub = agency.subscription;
    if (sub?.isActive && new Date(sub.endDate) > new Date()) return { label: "Paid", color: "#16A34A", bg: "#DCFCE7", icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    if (agency.trialEndsAt && new Date(agency.trialEndsAt) > new Date()) {
      const days = Math.ceil((new Date(agency.trialEndsAt).getTime() - Date.now()) / 86400000);
      return { label: `Trial (${days}d)`, color: "#D97706", bg: "#FEF9C3", icon: <Clock className="w-3.5 h-3.5" /> };
    }
    return { label: "Free / Expired", color: "#DC2626", bg: "#FEE2E2", icon: <XCircle className="w-3.5 h-3.5" /> };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Subscriptions & Billing</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Manage agency plans, trials, and billing</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Agencies", value: stats.totalAgencies, icon: <Building2 className="w-4 h-4" />, color: "#2563EB" },
            { label: "Paid Subscriptions", value: stats.paidSubscriptions, icon: <CheckCircle2 className="w-4 h-4" />, color: "#16A34A" },
            { label: "MRR", value: formatCurrency(stats.mrr), icon: <DollarSign className="w-4 h-4" />, color: "#7C3AED" },
            { label: "ARR", value: formatCurrency(stats.arr), icon: <TrendingUp className="w-4 h-4" />, color: "#0891B2" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[12px]" style={{ color: "#71717A" }}>{s.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.color + "15", color: s.color }}>{s.icon}</div>
              </div>
              <p className="text-[20px] font-bold" style={{ color: "#18181B" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
          <div key={key} className="card p-4" style={{ borderColor: key === "professional" ? "#2563EB" : undefined }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
              <p className="text-[14px] font-bold" style={{ color: plan.color }}>{plan.name}</p>
            </div>
            <p className="text-[20px] font-bold mb-1" style={{ color: "#18181B" }}>₹{plan.price.monthly}<span className="text-[12px] font-normal" style={{ color: "#71717A" }}>/mo</span></p>
            <p className="text-[11px] mb-3" style={{ color: "#A1A1AA" }}>₹{plan.price.yearly}/yr · save {Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)}%</p>
            <ul className="space-y-1">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-[12px]" style={{ color: "#52525B" }}>
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: plan.color }} /> {f}
                </li>
              ))}
            </ul>
            {stats && <p className="text-[11px] mt-3 font-semibold" style={{ color: "#71717A" }}>{stats.byPlan?.[key] ?? 0} agencies on this plan</p>}
          </div>
        ))}
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-[13px]" style={{ background: "#F0FDF4", color: "#15803D", border: "1px solid #86EFAC" }}>{msg}</div>
      )}

      {/* Agency table */}
      <div className="card overflow-hidden">
        <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>All Agencies ({agencies.length})</p></div>
        <table className="table">
          <thead><tr><th>Agency</th><th>Owner</th><th>Status</th><th>Plan</th><th>Actions</th></tr></thead>
          <tbody>
            {agencies.map((a) => {
              const s = statusOf(a);
              const isLoading = isPending && actionId === a.id;
              return (
                <tr key={a.id}>
                  <td><div><p className="font-medium text-[13px]">{a.name}</p><p className="text-[11px]" style={{ color: "#A1A1AA" }}>{a.email}</p></div></td>
                  <td><div><p className="text-[13px]">{a.ownerName}</p><p className="text-[11px]" style={{ color: "#A1A1AA" }}>{a.phone}</p></div></td>
                  <td>
                    <span className="badge flex items-center gap-1 w-fit" style={{ background: s.bg, color: s.color }}>{s.icon} {s.label}</span>
                  </td>
                  <td><span className="text-[12px] font-medium capitalize">{a.subscriptionPlan}</span></td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button onClick={() => handleStartTrial(a.id)} disabled={isLoading} className="text-[11px] px-2 py-1 rounded font-medium transition-colors hover:bg-yellow-50" style={{ color: "#D97706", border: "1px solid #FDE68A" }}>
                        Trial
                      </button>
                      {(["basic", "professional", "enterprise"] as const).map((plan) => (
                        <button key={plan} onClick={() => handleAssignPlan(a.id, plan, "monthly")} disabled={isLoading} className="text-[11px] px-2 py-1 rounded font-medium transition-colors hover:opacity-80 text-white capitalize" style={{ background: PLANS[plan].color }}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1, 3)}
                        </button>
                      ))}
                    </div>
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
