import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBillingStats, getAllSubscriptions } from "@/app/actions/subscription";
import { prisma } from "@/lib/prisma";
import { SubscriptionsDashboardClient } from "./SubscriptionsDashboardClient";

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const [statsResult, subsResult, agencies] = await Promise.all([
    getBillingStats(),
    getAllSubscriptions(),
    prisma.agency.findMany({
      select: {
        id: true, name: true, ownerName: true, email: true, phone: true,
        subscriptionPlan: true, trialEndsAt: true, status: true,
        subscription: { select: { plan: true, endDate: true, isActive: true, billingCycle: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SubscriptionsDashboardClient
      stats={statsResult.data}
      subscriptions={subsResult.subscriptions as never[]}
      agencies={JSON.parse(JSON.stringify(agencies))}
    />
  );
}
