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
  
  // Align todayStart and todayEnd with India Standard Time (IST, UTC+5:30)
  const localTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const localDateStr = localTime.toISOString().slice(0, 10);
  const todayStart = new Date(`${localDateStr}T00:00:00.000Z`);
  const todayEnd = new Date(`${localDateStr}T23:59:59.999Z`);
  
  // Set last7Start to cover the last 8 days to avoid any edge timezone cases
  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 7);

  const [deliveries, customers, products, assignedVehicle] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where: { deliveredById: session.userId, date: { gte: last7Start } },
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
      select: { id: true, vehicleNo: true, vehicleName: true, vehicleType: true },
    }),
  ]);

  let todayTrip = null;
  if (assignedVehicle) {
    todayTrip = await prisma.vehicleTripLog.findFirst({
      where: {
        vehicleId: assignedVehicle.id,
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const serializedDeliveries = deliveries.map((d) => ({
    ...d,
    date: (d.date as Date).toISOString(),
    createdAt: (d.createdAt as Date).toISOString(),
    paymentMode: d.paymentMode ?? "CASH",
    creditAmount: d.creditAmount ?? 0,
    updatedAt: undefined,
  }));

  const serializedTrip = todayTrip ? {
    departureTime: todayTrip.departureTime ? todayTrip.departureTime.toISOString() : null,
    returnTime: todayTrip.returnTime ? todayTrip.returnTime.toISOString() : null,
    tripStatus: todayTrip.tripStatus,
  } : null;

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
        todayTrip={serializedTrip}
      />
    </div>
  );
}
