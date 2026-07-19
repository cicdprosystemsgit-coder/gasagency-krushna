import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";
import { GodownTabsContainer } from "@/app/(dashboard)/admin/godown/GodownTabsContainer";
import { getAgencyTodayRange } from "@/lib/utils";
import { checkPermission } from "@/lib/rbac";

export default async function ManagerGodownPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const isAllowed = await checkPermission(session.userId, "godown", "read");
  if (!isAllowed) redirect("/manager");

  const { todayStart, todayEnd } = getAgencyTodayRange();

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
      where: { agencyId: session.agencyId! },
      orderBy: { entryDate: "desc" },
      take: 50,
      include: { submittedBy: { select: { name: true } } },
    }),
    prisma.godownRecord.aggregate({
      _sum: { filledCylindersReceived: true, emptyCylindersReturned: true },
      where: { agencyId: session.agencyId!, status: "APPROVED" },
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
      where: { agencyId: session.agencyId!, date: { gte: todayStart, lte: todayEnd } },
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
      where: { agencyId: session.agencyId!, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: "desc" },
      include: {
        product: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Godown Management"
        subtitle="Review company vehicle entries, manage internal delivery fleet, and view live GPS tracking"
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
        isAdmin={false}
        userId={session.userId}
        mapRecords={records}
        mapTrips={todayTripLogs}
        mapMovements={todayMovements}
        selectedDate={todayStr}
      />
    </div>
  );
}
