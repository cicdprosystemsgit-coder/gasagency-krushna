import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";
import { GodownClient } from "@/app/(dashboard)/admin/godown/GodownClient";
import { InternalVehiclesClient } from "@/app/(dashboard)/admin/godown/InternalVehiclesClient";

import { getAgencyTodayRange } from "@/lib/utils";

export default async function ManagerGodownPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const { todayStart, todayEnd } = getAgencyTodayRange();

  const [records, totals, deliveryVehicles, deliveryBoys, todayTripLogs, cylinderTypes] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        title="Godown Management"
        subtitle="Review company vehicle entries and manage internal delivery fleet"
        icon={<Warehouse className="w-5 h-5" />}
      />

      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "#52525B" }}>Company Supply Vehicle (Bharat Gas)</p>
        </div>
        <GodownClient
          initialRecords={records as Parameters<typeof GodownClient>[0]["initialRecords"]}
          totalFilled={totals._sum.filledCylindersReceived ?? 0}
          totalEmpty={totals._sum.emptyCylindersReturned ?? 0}
          isAdmin={true}
          userId={session.userId}
          cylinderTypes={cylinderTypes}
        />
      </div>

      <div className="my-8" style={{ borderTop: "2px dashed #E4E4E7" }} />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "#52525B" }}>Internal Delivery Fleet</p>
        </div>
        <InternalVehiclesClient
          initialVehicles={deliveryVehicles as Parameters<typeof InternalVehiclesClient>[0]["initialVehicles"]}
          initialTripLogs={todayTripLogs as Parameters<typeof InternalVehiclesClient>[0]["initialTripLogs"]}
          deliveryBoys={deliveryBoys}
          isAdmin={false}
          userId={session.userId}
          cylinderTypes={cylinderTypes}
        />
      </div>
    </div>
  );
}
