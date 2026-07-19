import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "@/app/(dashboard)/admin/credit-ledger/CreditLedgerClient";

import { checkPermission } from "@/lib/rbac";

export default async function ManagerCreditLedgerPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const isAllowed = await checkPermission(session.userId, "customers", "read");
  if (!isAllowed) redirect("/manager");

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
      take: 200,
      include: {
        customer: { select: { name: true, phone: true } },
        addedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Customer Credit Ledger (Udhari)"
        subtitle="Monitor customer balances and outstanding payments"
        icon={<CreditCard className="w-5 h-5" />}
      />
      <CreditLedgerClient
        customers={customers}
        initialEntries={entries as Parameters<typeof CreditLedgerClient>[0]["initialEntries"]}
        canEdit={true}
        userId={session.userId}
      />
    </div>
  );
}
