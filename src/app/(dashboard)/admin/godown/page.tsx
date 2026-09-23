import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
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
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");
  requireFeature(session, "godown");

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
    deliveryRequests,
    allProducts,
    deletedRecords,
    deletedTripLogs,
  ] = await Promise.all([
    prisma.godownRecord.findMany({
      where: {
        agencyId: session.agencyId!,
        isDeleted: false,
        entryDate: { gte: dateStart, lte: dateEnd },
      },
      orderBy: { entryDate: "desc" },
      include: { submittedBy: { select: { name: true } } },
    }),
    prisma.godownRecord.aggregate({
      _sum: { filledCylindersReceived: true, emptyCylindersReturned: true },
      where: {
        agencyId: session.agencyId!,
        isDeleted: false,
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
      where: { agencyId: session.agencyId!, isDeleted: false, date: { gte: dateStart, lte: dateEnd } },
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
    prisma.deliveryCountRequest.findMany({
      where: {
        agencyId: session.agencyId!,
        status: { in: ["APPROVED", "FULFILLED", "PENDING"] },
      },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            assignedVehicle: {
              select: { id: true, vehicleNo: true, vehicleName: true, vehicleType: true },
            },
          },
        },
        reviewedBy: { select: { name: true } },
        fulfilledBy: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      select: { id: true, name: true, isCylinder: true },
      orderBy: { name: "asc" },
    }),
    prisma.godownRecord.findMany({
      where: {
        agencyId: session.agencyId!,
        isDeleted: true,
      },
      orderBy: { deletedAt: "desc" },
      include: { submittedBy: { select: { name: true } } },
    }),
    prisma.vehicleTripLog.findMany({
      where: {
        agencyId: session.agencyId!,
        isDeleted: true,
      },
      orderBy: { deletedAt: "desc" },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  const serializedRequests = deliveryRequests.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    items: r.items as Array<{ productId: string; productName: string; requestedQty: number }>,
    totalRequested: r.totalRequested,
    notes: r.notes,
    status: r.status,
    reviewNote: r.reviewNote,
    reviewedBy: r.reviewedBy?.name || null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    fulfilledItems: r.fulfilledItems
      ? (r.fulfilledItems as Array<{ productId: string; productName: string; loadedQty: number }>)
      : null,
    totalLoaded: r.totalLoaded,
    fuelLitres: r.fuelLitres,
    fuelAmount: r.fuelAmount,
    fuelType: r.fuelType,
    fulfilledBy: r.fulfilledBy?.name || null,
    fulfilledAt: r.fulfilledAt ? r.fulfilledAt.toISOString() : null,
    godownNotes: r.godownNotes,
    createdAt: r.createdAt.toISOString(),
    deliveryBoy: {
      id: r.requestedBy.id,
      name: r.requestedBy.name,
      phone: r.requestedBy.phone,
      vehicle: r.requestedBy.assignedVehicle || null,
    },
  }));

  return (
    <div>
      <PageHeader
        title="Godown Management"
        subtitle="Track company supply vehicles, manage internal delivery fleet, and view live GPS tracking"
        icon={<Warehouse className="w-5 h-5" />}
      />

      <GodownTabsContainer
        initialRecords={records}
        initialDeletedRecords={deletedRecords}
        totalFilled={totals._sum.filledCylindersReceived ?? 0}
        totalEmpty={totals._sum.emptyCylindersReturned ?? 0}
        deliveryVehicles={deliveryVehicles}
        deliveryBoys={deliveryBoys}
        todayTripLogs={todayTripLogs}
        initialDeletedTripLogs={deletedTripLogs}
        cylinderTypes={cylinderTypes}
        isAdmin={session.role === "ADMIN"}
        userId={session.userId}
        userRole={session.role}
        mapRecords={records}
        mapTrips={todayTripLogs}
        mapMovements={todayMovements}
        selectedDate={selectedDate}
        deliveryRequests={serializedRequests}
        products={allProducts}
      />
    </div>
  );
}