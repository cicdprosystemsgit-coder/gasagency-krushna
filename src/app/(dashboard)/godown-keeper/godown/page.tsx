import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GodownKeeperClient } from "./GodownKeeperClient";

import { getAgencyTodayRange } from "@/lib/utils";

import { checkPermission } from "@/lib/rbac";

interface PageProps {
  searchParams?: Promise<{ date?: string }>;
}

export default async function GodownKeeperGodownPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "GODOWN_KEEPER") redirect("/login");
  requireFeature(session, "godown");

  const isAllowed = await checkPermission(session.userId, "godown", "read");
  if (!isAllowed) redirect("/godown-keeper");

  const params = (await searchParams) || {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || todayStr;

  const targetDate = new Date(selectedDate);
  const dateStart = new Date(targetDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(targetDate);
  dateEnd.setHours(23, 59, 59, 999);

  const [records, totals, deliveryVehicles, deliveryBoys, todayTripLogs, cylinderTypes] = await Promise.all([
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
        selectedDate={selectedDate}
      />
    </Suspense>
  );
}