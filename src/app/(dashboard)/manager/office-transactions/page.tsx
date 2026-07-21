import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt } from "lucide-react";
import { OfficeTransactionsClient } from "@/app/(dashboard)/admin/office-transactions/OfficeTransactionsClient";
import { getProductStockMap } from "@/app/actions/gst-invoicing";

export default async function ManagerOfficeTransactionsPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const [transactions, products, stockMap, customers] = await Promise.all([
    prisma.officeTransaction.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: {
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getProductStockMap(session.agencyId!),
    prisma.customer.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        type: true,
        customerCode: true,
        contactPerson: true,
        businessType: true,
      },
      orderBy: { name: "asc" },
    }),
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
        stockMap={stockMap}
        customers={customers}
        userId={session.userId}
        canEdit={true}
      />
    </div>
  );
}
