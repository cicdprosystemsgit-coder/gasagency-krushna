import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditCard } from "lucide-react";
import { CreditLedgerClient } from "./CreditLedgerClient";

export default async function CreditLedgerPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER", "STAFF", "DELIVERY_BOY"].includes(session.role)) redirect("/login");

  const [customers, entries] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.creditLedgerEntry.findMany({
      orderBy: { date: "desc" },
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
