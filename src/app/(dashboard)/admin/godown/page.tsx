import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";
import { GodownTabsContainer } from "./GodownTabsContainer";
import { getAgencyTodayRange } from "@/lib/utils";

interface PageProps {
  searchParams?: Promise<{ date?: string }>;
}

export default async function GodownPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const params = (await searchParams) || {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || todayStr;

  const targetDate = new Date(selectedDate);
  const dateStart = new Date(targetDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(targetDate);
  dateEnd.setHours(23, 59, 59, 999);

  const [
    records,
    totals,
    deliveryVehicles,
    deliveryBoys,
    todayTripLogs,
    cylinderTypes,
    todayMovements,
  ] = await Promise.all([
    prisma.godownRecord.findMany({
      where: {
        agencyId: session.agencyId!,
        entryDate: { gte: dateStart, lte: dateEnd },
      },
      orderBy: { entryDate: "desc" },
      include: { submittedBy: { select: { name: true } } },
    }),
    prisma.godownRecord.aggregate({
      _sum: { filledCylindersReceived: true, emptyCylindersReturned: true },
      where: {
        agencyId: session.agencyId!,
        status: "APPROVED",
        entryDate: { gte: dateStart, lte: dateEnd },
      },
    }),
    prisma.deliveryVehicle.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { agencyId: session.agencyId!, role: "DELIVERY_BOY", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicleTripLog.findMany({
      where: { agencyId: session.agencyId!, date: { gte: dateStart, lte: dateEnd } },
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isCylinder: true, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.godownInventory.findMany({
      where: { agencyId: session.agencyId!, date: { gte: dateStart, lte: dateEnd } },
      orderBy: { date: "desc" },
      include: {
        product: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Godown Management"
        subtitle="Track company supply vehicles, manage internal delivery fleet, and view live GPS tracking"
        icon={<Warehouse className="w-5 h-5" />}
      />

      <GodownTabsContainer
        initialRecords={records}
        totalFilled={totals._sum.filledCylindersReceived ?? 0}
        totalEmpty={totals._sum.emptyCylindersReturned ?? 0}
        deliveryVehicles={deliveryVehicles}
        deliveryBoys={deliveryBoys}
        todayTripLogs={todayTripLogs}
        cylinderTypes={cylinderTypes}
        isAdmin={session.role === "ADMIN"}
        userId={session.userId}
        mapRecords={records}
        mapTrips={todayTripLogs}
        mapMovements={todayMovements}
        selectedDate={selectedDate}
      />
    </div>
  );
}
