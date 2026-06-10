import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";
import { GodownClient } from "./GodownClient";
import { InternalVehiclesClient } from "./InternalVehiclesClient";

export default async function GodownPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const [records, totals, deliveryVehicles, deliveryBoys, todayTripLogs] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        title="Godown Management"
        subtitle="Track company supply vehicles and manage internal delivery fleet"
        icon={<Warehouse className="w-5 h-5" />}
      />

      {/* Company Vehicle Section */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "#52525B" }}>Company Supply Vehicle (Bharat Gas)</p>
        </div>
        <GodownClient
          initialRecords={records as Parameters<typeof GodownClient>[0]["initialRecords"]}
          totalFilled={totals._sum.filledCylindersReceived ?? 0}
          totalEmpty={totals._sum.emptyCylindersReturned ?? 0}
          isAdmin={session.role === "ADMIN"}
          userId={session.userId}
        />
      </div>

      {/* Divider */}
      <div className="my-8" style={{ borderTop: "2px dashed #E4E4E7" }} />

      {/* Internal Fleet Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "#52525B" }}>Internal Delivery Fleet</p>
        </div>
        <InternalVehiclesClient
          initialVehicles={deliveryVehicles as Parameters<typeof InternalVehiclesClient>[0]["initialVehicles"]}
          initialTripLogs={todayTripLogs as Parameters<typeof InternalVehiclesClient>[0]["initialTripLogs"]}
          deliveryBoys={deliveryBoys}
          isAdmin={session.role === "ADMIN"}
          userId={session.userId}
        />
      </div>
    </div>
  );
}
