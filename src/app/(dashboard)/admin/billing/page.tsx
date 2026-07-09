import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentSubscription, checkSubscriptionStatus } from "@/app/actions/subscription";
import { getBillingHistory } from "@/app/actions/cashfree";
import { PLANS } from "@/lib/plans";
import { CreditCard } from "lucide-react";
import { BillingClient } from "./BillingClient";

export default async function BillingPage() {
  const session = await getSession();
  if (!session || !session.agencyId || session.role !== "ADMIN") {
    redirect("/login");
  }

  const [{ agency, subscription }, statusResult, { transactions }] = await Promise.all([
    getCurrentSubscription(),
    checkSubscriptionStatus(session.agencyId),
    getBillingHistory(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-xs">
          <CreditCard className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">Billing & Subscription</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage your plan and view payment history</p>
        </div>
      </div>

      <div className="divider" />

      <BillingClient
        currentPlan={agency?.subscriptionPlan ?? "basic"}
        subscriptionStatus={statusResult}
        subscription={subscription ? {
          plan:         subscription.plan,
          billingCycle: subscription.billingCycle,
          endDate:      subscription.endDate.toISOString(),
          isActive:     subscription.isActive,
          amount:       subscription.amount,
        } : null}
        plans={PLANS}
        transactions={transactions.map(t => ({
          id:          t.id,
          orderId:     t.orderId,
          amount:      t.amount,
          plan:        t.plan,
          billingCycle: t.billingCycle,
          status:      t.status,
          createdAt:   t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
