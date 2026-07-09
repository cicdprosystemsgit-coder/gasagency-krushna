"use client";

import { useState } from "react";
import { createCashfreeOrder } from "@/app/actions/cashfree";
import { Check, Zap, Crown, Building2, Clock, AlertTriangle, Receipt } from "lucide-react";

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<void>;
    };
  }
}

type Plan = {
  name: string;
  price: { monthly: number; yearly: number };
  maxUsers: number;
  features: readonly string[];
  color: string;
};

type Transaction = {
  id: string;
  orderId: string;
  amount: number;
  plan: string;
  billingCycle: string;
  status: string;
  createdAt: string;
};

type SubscriptionStatus = {
  active: boolean;
  plan?: string;
  type?: string;
  trialDaysLeft?: number;
  reason?: string;
};

interface BillingClientProps {
  currentPlan: string;
  subscriptionStatus: SubscriptionStatus;
  subscription: {
    plan: string;
    billingCycle: string;
    endDate: string;
    isActive: boolean;
    amount: number;
  } | null;
  plans: Record<string, Plan>;
  transactions: Transaction[];
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  basic:        <Zap className="w-5 h-5" />,
  professional: <Crown className="w-5 h-5" />,
  enterprise:   <Building2 className="w-5 h-5" />,
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:  "bg-amber-50 text-amber-700 border border-amber-200",
  PAID:    "bg-green-50 text-green-700 border border-green-200",
  FAILED:  "bg-red-50 text-red-700 border border-red-200",
  EXPIRED: "bg-zinc-100 text-zinc-500 border border-zinc-200",
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function BillingClient({
  currentPlan,
  subscriptionStatus,
  subscription,
  plans,
  transactions,
}: BillingClientProps) {
  const [cycle, setCycle]       = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function handleUpgrade(plan: "basic" | "professional" | "enterprise") {
    setError(null);
    setLoading(plan);

    try {
      const result = await createCashfreeOrder(plan, cycle);

      if ("error" in result) {
        setError(result.error ?? "Failed to create order");
        return;
      }

      // Load Cashfree JS SDK on demand
      if (!window.Cashfree) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          s.onload  = () => resolve();
          s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
          document.head.appendChild(s);
        });
      }

      const cashfree = window.Cashfree!({ mode: "sandbox" });
      await cashfree.checkout({
        paymentSessionId: result.paymentSessionId,
        redirectTarget:   "_self",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  const yearlyDiscount = Math.round((1 - 10 / 12) * 100); // ≈ 17%

  return (
    <div className="space-y-8">
      {/* ── Current status banner ───────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
               style={{ backgroundColor: plans[currentPlan]?.color ?? "#6B7280" }}>
            {PLAN_ICONS[currentPlan]}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {plans[currentPlan]?.name ?? "Basic"} Plan
            </p>
            {subscriptionStatus.type === "trial" && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Trial — {subscriptionStatus.trialDaysLeft} day{subscriptionStatus.trialDaysLeft !== 1 ? "s" : ""} left
              </p>
            )}
            {subscriptionStatus.type === "paid" && subscription && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Renews {new Date(subscription.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                &nbsp;·&nbsp;{subscription.billingCycle === "yearly" ? "Annual" : "Monthly"}
              </p>
            )}
            {!subscriptionStatus.active && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" /> Subscription expired — upgrade to continue
              </p>
            )}
          </div>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-3 py-1.5 rounded-md transition-all ${cycle === "monthly" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${cycle === "yearly" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            Yearly
            <span className="bg-green-100 text-green-700 text-[10px] px-1 rounded font-semibold">
              -{yearlyDiscount}%
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Plan cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(Object.entries(plans) as [string, Plan][]).map(([key, plan]) => {
          const price       = cycle === "yearly" ? plan.price.yearly : plan.price.monthly;
          const isCurrentPlan = key === currentPlan && subscriptionStatus.active;
          const isLoading   = loading === key;

          return (
            <div
              key={key}
              className={`rounded-xl border-2 bg-white p-6 flex flex-col transition-all ${
                isCurrentPlan ? "border-blue-500 shadow-md" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
                       style={{ backgroundColor: plan.color }}>
                    {PLAN_ICONS[key]}
                  </div>
                  <span className="font-bold text-zinc-900">{plan.name}</span>
                </div>
                {isCurrentPlan && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Active
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-zinc-900">
                  {formatINR(price)}
                </span>
                <span className="text-zinc-400 text-sm ml-1">
                  /{cycle === "yearly" ? "yr" : "mo"}
                </span>
                {cycle === "yearly" && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Save {formatINR(plan.price.monthly * 12 - plan.price.yearly)} vs monthly
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className="w-full py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold text-center">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(key as "basic" | "professional" | "enterprise")}
                  disabled={!!loading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: plan.color }}
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Opening checkout…
                    </>
                  ) : (
                    key === "basic" ? "Downgrade" : "Upgrade Now"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Payment history ─────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Payment History</h2>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Order ID</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id} className={i > 0 ? "border-t border-zinc-100" : ""}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.orderId}</td>
                    <td className="px-4 py-3 text-zinc-700 capitalize">
                      {plans[t.plan]?.name ?? t.plan}
                      <span className="ml-1 text-xs text-zinc-400">({t.billingCycle})</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-900 font-medium">{formatINR(t.amount)}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(t.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status] ?? STATUS_STYLES.EXPIRED}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
