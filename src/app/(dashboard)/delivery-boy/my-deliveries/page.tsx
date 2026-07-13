import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Truck } from "lucide-react";
import { MyDeliveriesClient } from "./MyDeliveriesClient";

import { checkPermission } from "@/lib/rbac";

export default async function MyDeliveriesPage() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  const isAllowed = await checkPermission(session.userId, "deliveries", "read");
  if (!isAllowed) redirect("/delivery-boy");

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const last7Start = new Date(now); last7Start.setDate(last7Start.getDate() - 6); last7Start.setHours(0, 0, 0, 0);

  const [deliveries, customers, products, assignedVehicle] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where: { deliveredById: session.userId, date: { gte: last7Start, lte: todayEnd } },
      include: {
        customer: { select: { name: true, phone: true, address: true, type: true, customerCode: true } },
        product: { select: { name: true, saleRate: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.customer.findMany({
      where: { isActive: true, agencyId: session.agencyId! },
      select: {
        id: true, name: true, phone: true, address: true,
        type: true, customerCode: true, contactPerson: true, businessType: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, agencyId: session.agencyId! },
      select: { id: true, name: true, saleRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryVehicle.findUnique({
      where: { assignedToId: session.userId },
      select: { vehicleNo: true, vehicleName: true, vehicleType: true },
    }),
  ]);

  const serializedDeliveries = deliveries.map((d) => ({
    ...d,
    date: (d.date as Date).toISOString(),
    createdAt: (d.createdAt as Date).toISOString(),
    paymentMode: d.paymentMode ?? "CASH",
    creditAmount: d.creditAmount ?? 0,
    updatedAt: undefined,
  }));

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle="Record and track your daily cylinder deliveries"
        icon={<Truck className="w-5 h-5" />}
      />
      <MyDeliveriesClient
        initialDeliveries={serializedDeliveries as Parameters<typeof MyDeliveriesClient>[0]["initialDeliveries"]}
        customers={customers}
        products={products}
        userId={session.userId}
        assignedVehicle={assignedVehicle}
      />
    </div>
  );
}
