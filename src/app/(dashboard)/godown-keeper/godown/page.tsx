import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GodownKeeperClient } from "./GodownKeeperClient";

import { getAgencyTodayRange } from "@/lib/utils";

export default async function GodownKeeperGodownPage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER") redirect("/login");

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
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2563EB", borderTopColor: "transparent" }} />
      </div>
    }>
      <GodownKeeperClient
        initialRecords={records}
        totalFilled={totals._sum.filledCylindersReceived ?? 0}
        totalEmpty={totals._sum.emptyCylindersReturned ?? 0}
        userId={session.userId}
        cylinderTypes={cylinderTypes}
        initialVehicles={deliveryVehicles}
        initialTripLogs={todayTripLogs}
        deliveryBoys={deliveryBoys}
      />
    </Suspense>
  );
}
