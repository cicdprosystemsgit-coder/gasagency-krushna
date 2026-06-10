"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { PLANS } from "@/lib/plans";

// ── Get current subscription ─────────────────────────────────────────────────
export async function getCurrentSubscription() {
  const session = await getSession();
  if (!session || !session.agencyId) return { subscription: null, agency: null };

  const [agency, subscription] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        maxUsers: true,
      },
    }),
    prisma.agencySubscription.findUnique({
      where: { agencyId: session.agencyId },
    }),
  ]);

  return { agency, subscription };
}

// ── System admin: Get all subscriptions ──────────────────────────────────────
export async function getAllSubscriptions() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") return { subscriptions: [] };

  const subscriptions = await prisma.agencySubscription.findMany({
    include: {
      agency: { select: { name: true, email: true, ownerName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { subscriptions };
}

// ── System admin: Assign plan to agency ──────────────────────────────────────
export async function assignPlan(
  agencyId: string,
  plan: "basic" | "professional" | "enterprise",
  billingCycle: "monthly" | "yearly",
  paymentRef?: string
) {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") return { error: "Unauthorized" };

  if (!(plan in PLANS)) return { error: "Invalid plan" };

  const planDef = PLANS[plan];
  const amount =
    billingCycle === "yearly" ? planDef.price.yearly : planDef.price.monthly;
  const endDate = new Date();
  endDate.setMonth(
    endDate.getMonth() + (billingCycle === "yearly" ? 12 : 1)
  );

  const [subscription] = await Promise.all([
    prisma.agencySubscription.upsert({
      where: { agencyId },
      update: {
        plan,
        billingCycle,
        startDate: new Date(),
        endDate,
        isActive: true,
        amount,
        paymentRef: paymentRef ?? null,
        updatedAt: new Date(),
      },
      create: {
        agencyId,
        plan,
        billingCycle,
        startDate: new Date(),
        endDate,
        isActive: true,
        amount,
        paymentRef: paymentRef ?? null,
      },
    }),
    prisma.agency.update({
      where: { id: agencyId },
      data: {
        subscriptionPlan: plan,
        maxUsers: planDef.maxUsers === -1 ? 9999 : planDef.maxUsers,
        trialEndsAt: null, // clear trial on plan assignment
      },
    }),
  ]);

  revalidatePath("/system-admin/subscriptions");
  revalidatePath("/system-admin/agencies");
  return { subscription };
}

// ── Start 14-day trial ────────────────────────────────────────────────────────
export async function startTrial(agencyId: string) {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") return { error: "Unauthorized" };

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.agency.update({
    where: { id: agencyId },
    data: { trialEndsAt: trialEnd, subscriptionPlan: "professional" },
  });

  revalidatePath("/system-admin/agencies");
  return { success: true, trialEndsAt: trialEnd };
}

// ── Check if agency subscription is active ───────────────────────────────────
export async function checkSubscriptionStatus(agencyId: string) {
  const [agency, subscription] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: agencyId },
      select: { trialEndsAt: true, subscriptionPlan: true },
    }),
    prisma.agencySubscription.findUnique({
      where: { agencyId },
      select: { isActive: true, endDate: true, plan: true },
    }),
  ]);

  if (!agency) return { active: false, reason: "Agency not found" };

  // On active paid subscription
  if (subscription?.isActive && subscription.endDate > new Date()) {
    return { active: true, plan: subscription.plan, type: "paid" };
  }

  // On trial
  if (agency.trialEndsAt && agency.trialEndsAt > new Date()) {
    const daysLeft = Math.ceil(
      (agency.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return { active: true, plan: agency.subscriptionPlan, type: "trial", trialDaysLeft: daysLeft };
  }

  return { active: false, plan: "basic", type: "expired" };
}

// ── Get billing statistics for system admin ───────────────────────────────────
export async function getBillingStats() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") return { data: null };

  const [total, active, trial, subscriptions] = await Promise.all([
    prisma.agency.count(),
    prisma.agencySubscription.count({ where: { isActive: true, endDate: { gte: new Date() } } }),
    prisma.agency.count({ where: { trialEndsAt: { gte: new Date() } } }),
    prisma.agencySubscription.findMany({
      where: { isActive: true },
      select: { plan: true, amount: true, billingCycle: true },
    }),
  ]);

  const mrr = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === "yearly" ? s.amount / 12 : s.amount);
  }, 0);

  const byPlan = subscriptions.reduce((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    data: {
      totalAgencies: total,
      paidSubscriptions: active,
      onTrial: trial,
      freePlan: total - active - trial,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      byPlan,
    },
  };
}
