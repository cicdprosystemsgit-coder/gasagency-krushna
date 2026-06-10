import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GodownKeeperClient } from "./GodownKeeperClient";

export default async function GodownKeeperGodownPage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER") redirect("/login");

  const now = new Date();
  const yearStart  = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [godownRecords, deliveryVehicles, tripLogs, todayTripLogs, inventoryMovements, products] = await Promise.all([
    prisma.godownRecord.findMany({
      where: { agencyId: session.agencyId!, entryDate: { gte: yearStart, lte: monthEnd } },
      orderBy: { entryDate: "desc" },
    }),
    prisma.deliveryVehicle.findMany({
      where: { agencyId: session.agencyId!, status: "ACTIVE" },
      orderBy: { vehicleNo: "asc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.vehicleTripLog.findMany({
      where: { agencyId: session.agencyId!, date: { gte: yearStart, lte: monthEnd } },
      orderBy: { date: "desc" },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
      },
    }),
    prisma.vehicleTripLog.findMany({
      where: { agencyId: session.agencyId!, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
      },
    }),
    // All godown inventory movements for the year
    prisma.godownInventory.findMany({
      where: { agencyId: session.agencyId!, date: { gte: yearStart, lte: monthEnd }, product: { is: { isCylinder: false } } },
      orderBy: { date: "desc" },
      include: {
        product: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    // Active products list
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isCylinder: true },
    }),
  ]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2563EB", borderTopColor: "transparent" }} />
      </div>
    }>
      <GodownKeeperClient
        initialGodownRecords={godownRecords as Parameters<typeof GodownKeeperClient>[0]["initialGodownRecords"]}
        initialTripLogs={tripLogs as Parameters<typeof GodownKeeperClient>[0]["initialTripLogs"]}
        initialTodayTrips={todayTripLogs as Parameters<typeof GodownKeeperClient>[0]["initialTodayTrips"]}
        initialInventoryMovements={inventoryMovements as Parameters<typeof GodownKeeperClient>[0]["initialInventoryMovements"]}
        products={products}
        vehicles={deliveryVehicles as Parameters<typeof GodownKeeperClient>[0]["vehicles"]}
        userId={session.userId}
      />
    </Suspense>
  );
}
