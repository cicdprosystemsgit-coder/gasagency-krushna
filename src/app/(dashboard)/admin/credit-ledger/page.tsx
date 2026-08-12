import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "./CreditLedgerClient";

// Always fetch fresh data — delivery actions create credit entries dynamically
export const dynamic = "force-dynamic";

export default async function CreditLedgerPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER", "STAFF", "DELIVERY_BOY"].includes(session.role)) redirect("/login");
  requireFeature(session, "credit_ledger");

  const [customers, entries] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true, agencyId: session.agencyId!, type: "COMMERCIAL" },
      orderBy: { name: "asc" },
      include: {
        deliveries: {
          select: {
            id: true,
            date: true,
            deliveredQty: true,
            returnedQty: true,
            pendingQty: true,
          }
        }
      }
    }),
    prisma.creditLedgerEntry.findMany({
      where: { agencyId: session.agencyId!, customer: { type: "COMMERCIAL" } },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
      take: 1000,
      select: {
        id: true,
        date: true,
        createdAt: true,
        type: true,
        amount: true,
        description: true,
        customerId: true,
        customer: { select: { name: true, phone: true } },
        addedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Customer Credit Ledger (Udhari)"
        subtitle="Monitor customer balances, credit history, and outstanding invoices"
        icon={<CreditCard className="w-5 h-5" />}
      />
      <CreditLedgerClient
        customers={customers}
        initialEntries={entries as Parameters<typeof CreditLedgerClient>[0]["initialEntries"]}
        canEdit={["ADMIN", "MANAGER"].includes(session.role)}
        userId={session.userId}
      />
    </div>
  );
}