import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "@/app/(dashboard)/admin/credit-ledger/CreditLedgerClient";

export default async function ManagerCreditLedgerPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const [customers, entries] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.creditLedgerEntry.findMany({
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
