import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt } from "lucide-react";
import { OfficeTransactionsClient } from "@/app/(dashboard)/admin/office-transactions/OfficeTransactionsClient";

export default async function ManagerOfficeTransactionsPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const [transactions, products] = await Promise.all([
    prisma.officeTransaction.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: {
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
      },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Office Transactions"
        subtitle="Manage new connections, regulators and office sales"
        icon={<Receipt className="w-5 h-5" />}
      />
      <OfficeTransactionsClient
        initialTransactions={transactions as Parameters<typeof OfficeTransactionsClient>[0]["initialTransactions"]}
        products={products}
        userId={session.userId}
        canEdit={true}
      />
    </div>
  );
}
