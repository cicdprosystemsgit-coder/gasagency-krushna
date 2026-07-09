"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { revalidatePath } from "next/cache";

const CF_BASE   = process.env.CASHFREE_BASE_URL ?? "https://sandbox.cashfree.com/pg";
const CF_APP_ID = process.env.CASHFREE_APP_ID!;
const CF_SECRET = process.env.CASHFREE_SECRET!;
const APP_URL   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ── Shared: activate subscription after confirmed payment ─────────────────────
export async function activateSubscriptionFromPayment({
  agencyId,
  orderId,
  plan,
  billingCycle,
  amount,
  cfPaymentId,
  cfPaymentStatus,
}: {
  agencyId:       string;
  orderId:        string;
  plan:           "basic" | "professional" | "enterprise";
  billingCycle:   "monthly" | "yearly";
  amount:         number;
  cfPaymentId?:   string;
  cfPaymentStatus?: string;
}) {
  const planDef = PLANS[plan];
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (billingCycle === "yearly" ? 12 : 1));

  await prisma.$transaction([
    prisma.cashfreeTransaction.update({
      where: { orderId },
      data:  { status: "PAID", cfPaymentId: cfPaymentId ?? null, cfPaymentStatus: cfPaymentStatus ?? null },
    }),
    prisma.agencySubscription.upsert({
      where:  { agencyId },
      update: {
        plan, billingCycle, startDate: new Date(), endDate,
        isActive: true, amount, paymentRef: orderId, updatedAt: new Date(),
      },
      create: {
        agencyId, plan, billingCycle, startDate: new Date(), endDate,
        isActive: true, amount, paymentRef: orderId,
      },
    }),
    prisma.agency.update({
      where: { id: agencyId },
      data:  {
        subscriptionPlan: plan,
        maxUsers:         planDef.maxUsers === -1 ? 9999 : planDef.maxUsers,
        trialEndsAt:      null, // clear any running trial on paid activation
      },
    }),
  ]);

  revalidatePath("/admin/billing");
  revalidatePath("/system-admin/subscriptions");
}

// ── Step 1: Create a Cashfree order and return the paymentSessionId ────────────
export async function createCashfreeOrder(
  plan:         "basic" | "professional" | "enterprise",
  billingCycle: "monthly" | "yearly"
) {
  const session = await getSession();
  if (!session?.agencyId) return { error: "Unauthorized" };
  if (!(plan in PLANS))   return { error: "Invalid plan" };

  const planDef = PLANS[plan];
  const amount  = billingCycle === "yearly" ? planDef.price.yearly : planDef.price.monthly;

  // Max 50 chars, only alphanumeric + underscore allowed by Cashfree
  const orderId = `gak_${session.agencyId.slice(-10)}_${Date.now()}`;

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { email: true, name: true, phone: true },
  });

  const response = await fetch(`${CF_BASE}/orders`, {
    method: "POST",
    headers: {
      "x-client-id":     CF_APP_ID,
      "x-client-secret": CF_SECRET,
      "x-api-version":   "2023-08-01",
      "Content-Type":    "application/json",
    },
    body: JSON.stringify({
      order_id:       orderId,
      order_amount:   amount,
      order_currency: "INR",
      customer_details: {
        customer_id:    session.userId,
        customer_email: user?.email ?? session.email,
        customer_name:  user?.name  ?? session.name,
        customer_phone: user?.phone ?? "9999999999",
      },
      order_meta: {
        return_url: `${APP_URL}/admin/billing/callback?order_id={order_id}`,
        notify_url: `${APP_URL}/api/webhook/cashfree`,
      },
      order_note: `${planDef.name} plan (${billingCycle}) — Gas Agency Platform`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[createCashfreeOrder] Cashfree error:", data);
    return { error: data.message ?? "Failed to create payment order" };
  }

  await prisma.cashfreeTransaction.create({
    data: {
      agencyId:         session.agencyId,
      orderId:          data.order_id,
      paymentSessionId: data.payment_session_id,
      amount,
      plan,
      billingCycle,
      status: "ACTIVE",
    },
  });

  return {
    ok:               true as const,
    orderId:          data.order_id          as string,
    paymentSessionId: data.payment_session_id as string,
    amount,
    plan,
    billingCycle,
  };
}

// ── Step 2: Poll payment status — called by the callback page after redirect ──
export async function verifyCashfreePayment(orderId: string) {
  const session = await getSession();
  if (!session?.agencyId) return { error: "Unauthorized" };

  const tx = await prisma.cashfreeTransaction.findUnique({
    where:  { orderId },
    select: { agencyId: true, status: true, plan: true, billingCycle: true, amount: true },
  });

  if (!tx || tx.agencyId !== session.agencyId) return { error: "Order not found" };

  // Already activated by webhook — nothing to do
  if (tx.status === "PAID") return { ok: true as const, status: "PAID", alreadyActivated: true };

  // Fetch live status from Cashfree
  const response = await fetch(`${CF_BASE}/orders/${orderId}`, {
    headers: {
      "x-client-id":     CF_APP_ID,
      "x-client-secret": CF_SECRET,
      "x-api-version":   "2023-08-01",
    },
  });

  const data = await response.json();
  if (!response.ok) return { error: "Failed to verify payment with Cashfree" };

  // Cashfree order statuses: ACTIVE | PAID | EXPIRED | CANCELLED | TERMINATION_REQUESTED
  const cfStatus: string = data.order_status;

  if (cfStatus === "PAID") {
    await activateSubscriptionFromPayment({
      agencyId:     session.agencyId,
      orderId,
      plan:         tx.plan         as "basic" | "professional" | "enterprise",
      billingCycle: tx.billingCycle as "monthly" | "yearly",
      amount:       tx.amount,
      cfPaymentId:  String(data.cf_order_id ?? ""),
    });
    return { ok: true as const, status: "PAID" };
  }

  if (cfStatus === "EXPIRED" || cfStatus === "CANCELLED") {
    await prisma.cashfreeTransaction.update({
      where: { orderId },
      data:  { status: cfStatus },
    });
  }

  return { ok: true as const, status: cfStatus };
}

// ── Billing history for the current agency ────────────────────────────────────
export async function getBillingHistory() {
  const session = await getSession();
  if (!session?.agencyId) return { transactions: [] };

  const transactions = await prisma.cashfreeTransaction.findMany({
    where:   { agencyId: session.agencyId },
    orderBy: { createdAt: "desc" },
    take:    20,
  });

  return { transactions };
}
