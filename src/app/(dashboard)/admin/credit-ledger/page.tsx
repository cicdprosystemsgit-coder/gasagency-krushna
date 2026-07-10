import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "./CreditLedgerClient";

// Always fetch fresh data — delivery actions create credit entries dynamically
export const dynamic = "force-dynamic";

export default async function CreditLedgerPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER", "STAFF", "DELIVERY_BOY"].includes(session.role)) redirect("/login");

  const [customers, entries] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true, agencyId: session.agencyId! },
      orderBy: { name: "asc" },
    }),
    prisma.creditLedgerEntry.findMany({
      where: { agencyId: session.agencyId! },
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
