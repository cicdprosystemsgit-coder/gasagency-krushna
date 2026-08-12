import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "@/app/(dashboard)/admin/credit-ledger/CreditLedgerClient";

import { checkPermission } from "@/lib/rbac";

export default async function DeliveryCreditLedgerPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");
  requireFeature(session, "credit_ledger");

  const isAllowed = await checkPermission(session.userId, "customers", "read");
  if (!isAllowed) redirect("/delivery-boy");

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
      where: { addedById: session.userId, customer: { type: "COMMERCIAL" } },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
      take: 100,
      include: {
        customer: { select: { name: true, phone: true } },
        addedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Credit Ledger (Udhari)" subtitle="Customer udhari tracking" icon={<CreditCard className="w-5 h-5" />} />
      <CreditLedgerClient
        customers={customers}
        initialEntries={entries as Parameters<typeof CreditLedgerClient>[0]["initialEntries"]}
        canEdit={false}
        userId={session.userId}
      />
    </div>
  );
}