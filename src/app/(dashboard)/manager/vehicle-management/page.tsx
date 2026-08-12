import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Truck } from "lucide-react";
import { VehicleManagementClient } from "@/app/(dashboard)/admin/vehicle-management/VehicleManagementClient";

export default async function ManagerVehicleManagementPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "MANAGER" || !session.agencyId)
    redirect("/login");

  const [vehicles, tripLogs, employees] = await Promise.all([
    prisma.deliveryVehicle.findMany({
      where: { agencyId: session.agencyId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicleTripLog.findMany({
      where: { agencyId: session.agencyId },
      include: {
        vehicle: {
          select: {
            vehicleNo: true,
            vehicleName: true,
            assignedTo: { select: { name: true } },
          },
        },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: {
        agencyId: session.agencyId,
        isActive: true,
        role: { in: ["DELIVERY_BOY", "GODOWN_KEEPER", "STAFF", "MANAGER"] },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedVehicles = vehicles.map(v => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
    updatedAt: undefined,
  }));

  const serializedLogs = tripLogs.map(t => ({
    ...t,
    date: (t.date as Date).toISOString(),
    departureTime: t.departureTime ? (t.departureTime as Date).toISOString() : null,
    returnTime: t.returnTime ? (t.returnTime as Date).toISOString() : null,
    createdAt: (t.createdAt as Date).toISOString(),
    updatedAt: undefined,
  }));

  return (
    <div>
      <PageHeader
        title="Vehicle Management"
        subtitle="Manage fleet, assign drivers, record trips and track deliveries"
        icon={<Truck className="w-5 h-5" />}
      />
      <VehicleManagementClient
        initialVehicles={serializedVehicles as any}
        initialTripLogs={serializedLogs as any}
        employees={employees}
        isAdmin={false}
      />
    </div>
  );
}