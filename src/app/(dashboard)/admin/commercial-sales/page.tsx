import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingCart } from "lucide-react";
import { CommercialSalesClient } from "./CommercialSalesClient";

export default async function CommercialSalesPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER", "STAFF"].includes(session.role)) redirect("/login");

  const [sales, customers, products, deliveryBoys, commercialDeliveries] = await Promise.all([
    prisma.commercialSale.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true, type: true } },
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
        deliveredBy: { select: { name: true } },
      },
    }),
    prisma.customer.findMany({
      where: { type: "COMMERCIAL", isActive: true, agencyId: session.agencyId! },
      orderBy: { name: "asc" },
      include: {
        deliveries: {
          orderBy: { date: "desc" },
          include: {
            product: { select: { name: true } },
            deliveredBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, agencyId: session.agencyId! },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "DELIVERY_BOY", isActive: true, agencyId: session.agencyId! },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryRecord.findMany({
      where: {
        agencyId: session.agencyId!,
        customer: { type: "COMMERCIAL" },
      },
      orderBy: { date: "desc" },
      include: {
        customer: { select: { name: true, type: true } },
        product: { select: { name: true, saleRate: true } },
        deliveredBy: { select: { name: true } },
      },
    }),
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
        deliveryBoys={deliveryBoys}
        commercialDeliveries={commercialDeliveries as Parameters<typeof CommercialSalesClient>[0]["commercialDeliveries"]}
        canEdit={["ADMIN", "MANAGER"].includes(session.role)}
        userId={session.userId}
      />
    </div>
  );
}
