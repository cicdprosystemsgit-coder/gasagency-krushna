import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt } from "lucide-react";
import { OfficeTransactionsClient } from "@/app/(dashboard)/admin/office-transactions/OfficeTransactionsClient";

export default async function StaffOfficeTransactionsPage() {
  const session = await getSession();
  if (!session || session.role !== "STAFF") redirect("/login");

  const [transactions, products] = await Promise.all([
    prisma.officeTransaction.findMany({
      where: { addedById: session.userId },
      orderBy: { date: "desc" },
      take: 50,
      include: { product: { select: { name: true } }, addedBy: { select: { name: true } } },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Office Transactions" subtitle="Your office transactions" icon={<Receipt className="w-5 h-5" />} />
      <OfficeTransactionsClient
        initialTransactions={transactions as Parameters<typeof OfficeTransactionsClient>[0]["initialTransactions"]}
        products={products}
        userId={session.userId}
        canEdit={false}
      />
    </div>
  );
}
