import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingCart } from "lucide-react";
import { CommercialSalesClient } from "./CommercialSalesClient";

export default async function CommercialSalesPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER", "STAFF"].includes(session.role)) redirect("/login");

  const [sales, customers, products] = await Promise.all([
    prisma.commercialSale.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true, type: true } },
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
      },
    }),
    prisma.customer.findMany({
      where: { type: "COMMERCIAL", isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Commercial Sales"
        subtitle="Hotels, restaurants, schools and other commercial customers — track deliveries and outstanding balances"
        icon={<ShoppingCart className="w-5 h-5" />}
      />
      <CommercialSalesClient
        initialSales={sales as Parameters<typeof CommercialSalesClient>[0]["initialSales"]}
        customers={customers}
        products={products}
        canEdit={["ADMIN", "MANAGER"].includes(session.role)}
        userId={session.userId}
      />
    </div>
  );
}
